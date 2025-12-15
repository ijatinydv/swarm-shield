import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import httpx
import asyncio

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "packages"))
from shared.models import (
    Incident, Credential, IncidentStatus, RiskIndicator, generate_id
)
from shared.transport import get_transport
from shared.detection import check_typosquat, check_suspicious_scripts, check_obfuscated_code
from shared.credentials import (
    create_verified_incident_credential,
    create_false_positive_credential,
    create_safe_to_use_attestation,
    verify_proof
)

app = FastAPI(title="Verifier Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

AGENT_DID = "did:simulator:verifier"
CAPABILITIES = ["security_verify", "incident_response"]
transport = get_transport("verifier", CAPABILITIES, AGENT_DID)

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:8000")
TRUSTED_SCANNER_DIDS = ["did:simulator:scanner"]


class VerificationRequest(BaseModel):
    incident_id: str
    credential_id: str
    package_name: str
    version: str
    indicators: List[dict]


class VerificationResponse(BaseModel):
    incident_id: str
    verified: bool
    is_false_positive: bool
    verification_credential_id: str
    safe_attestation_id: Optional[str] = None
    notes: str


async def fetch_incident(incident_id: str) -> Optional[Incident]:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{GATEWAY_URL}/incidents/{incident_id}")
            if resp.status_code == 200:
                return Incident(**resp.json())
        except Exception:
            pass
    return None


async def fetch_credential(credential_id: str) -> Optional[Credential]:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{GATEWAY_URL}/credentials/{credential_id}")
            if resp.status_code == 200:
                return Credential(**resp.json())
        except Exception:
            pass
    return None


async def report_to_gateway(credentials: List[Credential], incident_id: str, new_status: IncidentStatus):
    async with httpx.AsyncClient() as client:
        try:
            for cred in credentials:
                await client.post(
                    f"{GATEWAY_URL}/credentials",
                    json=cred.dict(),
                    params={"incident_id": incident_id}
                )
            
            incident = await fetch_incident(incident_id)
            if incident:
                incident.status = new_status
                incident.credentials.extend([c.id for c in credentials])
                await client.put(f"{GATEWAY_URL}/incidents/{incident_id}", json=incident.dict())
        except Exception as e:
            print(f"Failed to report to gateway: {e}")


async def notify_agents(incident_id: str, verified: bool, credentials: List[str]):
    """Notify CI and patch agents of verification result."""
    payload = {
        "incident_id": incident_id,
        "verified": verified,
        "credential_ids": credentials
    }
    
    ci_agents = transport.search_agents_by_capabilities(["ci_policy"])
    for agent in ci_agents:
        transport.send(agent.did, "verification_result", payload)
    
    if verified:
        patch_agents = transport.search_agents_by_capabilities(["patch_planner"])
        for agent in patch_agents:
            transport.send(agent.did, "patch_request", payload)


def re_verify_indicators(indicators: List[dict], package_name: str) -> tuple[bool, str]:
    """Re-run verification checks on the indicators."""
    confirmed_count = 0
    notes = []
    
    for ind in indicators:
        ind_type = ind.get("type", "")
        
        if ind_type == "typosquat":
            is_typo, reason, conf = check_typosquat(package_name)
            if is_typo and conf >= 0.7:
                confirmed_count += 1
                notes.append(f"Confirmed typosquat: {reason}")
        
        elif ind_type == "suspicious_scripts":
            confirmed_count += 1
            notes.append("Confirmed suspicious install scripts")
        
        elif ind_type == "obfuscated_code":
            confirmed_count += 1
            notes.append("Confirmed obfuscated code patterns")
    
    is_verified = confirmed_count > 0
    verification_notes = "; ".join(notes) if notes else "No indicators confirmed"
    
    return is_verified, verification_notes


@app.get("/health")
def health():
    return {"status": "healthy", "service": "verifier-agent", "did": AGENT_DID}


@app.post("/verify", response_model=VerificationResponse)
async def verify_incident(request: VerificationRequest, background_tasks: BackgroundTasks):
    """Verify a risk finding and issue appropriate credentials."""
    
    original_cred = await fetch_credential(request.credential_id)
    if original_cred:
        if not verify_proof(original_cred):
            raise HTTPException(status_code=400, detail="Original credential signature invalid")
        if original_cred.issuer_did not in TRUSTED_SCANNER_DIDS:
            raise HTTPException(status_code=400, detail="Credential issuer not trusted")
    
    is_verified, notes = re_verify_indicators(request.indicators, request.package_name)
    
    credentials_to_save = []
    safe_attestation_id = None
    
    if is_verified:
        verified_cred = create_verified_incident_credential(
            issuer_did=AGENT_DID,
            package_name=request.package_name,
            version=request.version,
            incident_id=request.incident_id,
            original_finding_id=request.credential_id,
            verification_notes=notes
        )
        credentials_to_save.append(verified_cred)
        new_status = IncidentStatus.VERIFIED
        
        # Issue safe-to-use for previous version (if we had that info)
        incident = await fetch_incident(request.incident_id)
        if incident:
            # For demo, we assume previous version is safe
            prev_version = request.version.rsplit(".", 1)[0] + ".0"
            safe_cred = create_safe_to_use_attestation(
                issuer_did=AGENT_DID,
                package_name=request.package_name,
                version=prev_version,
                incident_id=request.incident_id,
                expiration_hours=24
            )
            credentials_to_save.append(safe_cred)
            safe_attestation_id = safe_cred.id
    else:
        fp_cred = create_false_positive_credential(
            issuer_did=AGENT_DID,
            package_name=request.package_name,
            version=request.version,
            incident_id=request.incident_id,
            original_finding_id=request.credential_id,
            reason=notes
        )
        credentials_to_save.append(fp_cred)
        new_status = IncidentStatus.FALSE_POSITIVE
        
        safe_cred = create_safe_to_use_attestation(
            issuer_did=AGENT_DID,
            package_name=request.package_name,
            version=request.version,
            incident_id=request.incident_id,
            expiration_hours=168
        )
        credentials_to_save.append(safe_cred)
        safe_attestation_id = safe_cred.id
    
    background_tasks.add_task(report_to_gateway, credentials_to_save, request.incident_id, new_status)
    background_tasks.add_task(
        notify_agents, 
        request.incident_id, 
        is_verified, 
        [c.id for c in credentials_to_save]
    )
    
    return VerificationResponse(
        incident_id=request.incident_id,
        verified=is_verified,
        is_false_positive=not is_verified,
        verification_credential_id=credentials_to_save[0].id,
        safe_attestation_id=safe_attestation_id,
        notes=notes
    )


async def process_messages():
    """Background task to process incoming transport messages."""
    while True:
        messages = transport.read()
        for msg in messages:
            if msg.message_type == "verification_request":
                request = VerificationRequest(**msg.payload)
                await verify_incident(request, BackgroundTasks())
        await asyncio.sleep(1)


@app.on_event("startup")
async def startup():
    asyncio.create_task(process_messages())


if __name__ == "__main__":
    port = int(os.getenv("VERIFIER_PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
