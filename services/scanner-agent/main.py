import os
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import httpx
import asyncio

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "packages"))
from shared.models import (
    Incident, PackageReleaseEvent, Severity, IncidentStatus, 
    RiskIndicator, generate_id
)
from shared.transport import get_transport
from shared.detection import analyze_package_release
from shared.credentials import create_risk_finding_credential

app = FastAPI(title="Scanner Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

AGENT_DID = "did:simulator:scanner"
CAPABILITIES = ["security_scan", "dependency_analysis"]
transport = get_transport("scanner", CAPABILITIES, AGENT_DID)

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:8000")
VERIFIER_URL = os.getenv("VERIFIER_URL", "http://localhost:8002")


class ScanRequest(BaseModel):
    package_name: str
    version: str
    prev_version: Optional[str] = None
    repo_url: Optional[str] = None
    metadata: dict = {}


class ScanResponse(BaseModel):
    incident_id: Optional[str]
    is_suspicious: bool
    severity: Optional[str]
    indicators: list
    credential_id: Optional[str]


async def notify_verifiers(incident: Incident, credential_id: str):
    """Send verification request to verifier agent via HTTP."""
    payload = {
        "incident_id": incident.id,
        "credential_id": credential_id,
        "package_name": incident.package_name,
        "version": incident.version,
        "indicators": [ind.dict() for ind in incident.indicators]
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(f"{VERIFIER_URL}/verify", json=payload)
            print(f"Verifier response: {resp.status_code}")
        except Exception as e:
            print(f"Failed to notify verifier: {e}")


async def report_to_gateway(incident: Incident, credential: dict):
    """Report incident and credential to gateway API."""
    async with httpx.AsyncClient() as client:
        try:
            # Serialize via Pydantic JSON to avoid datetime serialization issues
            incident_payload = json.loads(incident.json())
            credential_payload = json.loads(json.dumps(credential, default=str))
            await client.post(f"{GATEWAY_URL}/incidents", json=incident_payload)
            await client.post(
                f"{GATEWAY_URL}/credentials",
                json=credential_payload,
                params={"incident_id": incident.id}
            )
        except Exception as e:
            print(f"Failed to report to gateway: {e}")


def determine_severity(indicators: list, confidence: float) -> Severity:
    """Determine incident severity based on indicators and confidence."""
    has_typosquat = any(i.type == "typosquat" for i in indicators)
    has_scripts = any(i.type == "suspicious_scripts" for i in indicators)
    has_obfuscated = any(i.type == "obfuscated_code" for i in indicators)
    
    if confidence >= 0.85 and (has_typosquat or has_scripts):
        return Severity.CRITICAL
    elif confidence >= 0.7 or has_scripts:
        return Severity.HIGH
    elif confidence >= 0.5 or has_obfuscated:
        return Severity.MEDIUM
    return Severity.LOW


@app.get("/health")
def health():
    return {"status": "healthy", "service": "scanner-agent", "did": AGENT_DID}


@app.post("/event/release", response_model=ScanResponse)
async def handle_release_event(event: PackageReleaseEvent, background_tasks: BackgroundTasks):
    """Handle incoming package release event and scan for threats."""
    metadata = event.metadata or {}
    content = metadata.pop("content_sample", "")
    
    indicators, confidence = analyze_package_release(
        event.package_name,
        event.new_version,
        metadata=metadata,
        content_sample=content
    )
    
    if not indicators:
        return ScanResponse(
            incident_id=None,
            is_suspicious=False,
            severity=None,
            indicators=[],
            credential_id=None
        )
    
    severity = determine_severity(indicators, confidence)
    
    incident = Incident(
        package_name=event.package_name,
        version=event.new_version,
        severity=severity,
        status=IncidentStatus.DETECTED,
        title=f"Suspicious package: {event.package_name}@{event.new_version}",
        description=f"Scanner detected {len(indicators)} risk indicator(s) with {confidence:.0%} confidence",
        indicators=indicators
    )
    
    credential = create_risk_finding_credential(
        issuer_did=AGENT_DID,
        package_name=event.package_name,
        version=event.new_version,
        incident_id=incident.id,
        reasons=[ind.description for ind in indicators],
        confidence=confidence,
        evidence_hashes=[ind.evidence for ind in indicators if ind.evidence]
    )
    
    incident.credentials.append(credential.id)
    
    background_tasks.add_task(report_to_gateway, incident, credential.dict())
    background_tasks.add_task(notify_verifiers, incident, credential.id)
    
    return ScanResponse(
        incident_id=incident.id,
        is_suspicious=True,
        severity=severity.value,
        indicators=[ind.dict() for ind in indicators],
        credential_id=credential.id
    )


@app.post("/scan", response_model=ScanResponse)
async def scan_package(request: ScanRequest, background_tasks: BackgroundTasks):
    """Manually trigger a package scan."""
    event = PackageReleaseEvent(
        package_name=request.package_name,
        new_version=request.version,
        prev_version=request.prev_version,
        repo_url=request.repo_url,
        metadata=request.metadata
    )
    return await handle_release_event(event, background_tasks)


async def process_messages():
    """Background task to process incoming transport messages."""
    while True:
        messages = transport.read()
        for msg in messages:
            if msg.message_type == "package_release":
                event = PackageReleaseEvent(**msg.payload)
                # Process in background
                asyncio.create_task(handle_release_event(event, BackgroundTasks()))
        await asyncio.sleep(1)


@app.on_event("startup")
async def startup():
    asyncio.create_task(process_messages())


if __name__ == "__main__":
    port = int(os.getenv("SCANNER_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
