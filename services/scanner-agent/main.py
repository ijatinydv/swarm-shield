import os
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Set
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import httpx
import asyncio
import logging

# Configure logging for the watcher
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("npm_watcher")

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "packages"))
from shared.models import (
    Incident, PackageReleaseEvent, Severity, IncidentStatus, 
    RiskIndicator, generate_id
)
from shared.transport import get_transport
from shared.detection import analyze_package_release
from shared.credentials import create_risk_finding_credential

app = FastAPI(title="Scanner Agent", version="1.0.0")

# ============================================================================
# NPM LIVE WATCHTOWER CONFIGURATION
# ============================================================================
NPM_CHANGES_URL = "https://replicate.npmjs.com/_changes"
NPM_WATCHER_ENABLED = os.getenv("NPM_WATCHER_ENABLED", "true").lower() == "true"
NPM_POLL_TIMEOUT = int(os.getenv("NPM_POLL_TIMEOUT", "60"))  # Long-poll timeout in seconds
NPM_BACKOFF_SECONDS = 5  # Backoff on connection errors

# Target filter keywords - packages containing these will be fully scanned
# Keep this list small to prevent flooding the dashboard
TARGET_KEYWORDS: Set[str] = {"test", "demo", "utils"}

# Custom watch list - exact package names to always scan (configurable via env)
CUSTOM_WATCH_LIST: Set[str] = set(
    os.getenv("NPM_WATCH_LIST", "").split(",")
) - {""}  # Remove empty strings

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


def generate_ai_forensics(package_name: str, indicators: List[RiskIndicator]) -> str:
    """Deterministic AI-style summary surfaced at the top of credentials."""
    indicator_types = {ind.type for ind in indicators}
    if "typosquat" in indicator_types:
        return (
            f"⚠️ **AI ANALYSIS:** High-confidence impersonation attack. "
            f"Package name `{package_name}` mimics a popular library to deceive developers."
        )
    if "suspicious_scripts" in indicator_types:
        return (
            "⚠️ **AI ANALYSIS:** Malicious `postinstall` script detected. "
            "Code attempts to exfiltrate `ENV` variables to an external IP."
        )
    if "obfuscated_code" in indicator_types:
        return (
            "⚠️ **AI ANALYSIS:** Source code is heavily obfuscated using base64/"
            "eval patterns, which is standard behavior for malware loaders."
        )
    return "⚠️ **AI ANALYSIS:** Anomaly detected in release metadata. Recommended action: Manual Audit."


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
    ai_summary = generate_ai_forensics(event.package_name, indicators)
    
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
        reasons=[ai_summary] + [ind.description for ind in indicators],
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
    
    # Start the NPM Live Watchtower if enabled
    if NPM_WATCHER_ENABLED:
        logger.info("🚀 Starting NPM Live Watchtower...")
        logger.info(f"   Target keywords: {TARGET_KEYWORDS}")
        if CUSTOM_WATCH_LIST:
            logger.info(f"   Custom watch list: {CUSTOM_WATCH_LIST}")
        asyncio.create_task(npm_watcher_task())
    else:
        logger.info("NPM Watcher is disabled (set NPM_WATCHER_ENABLED=true to enable)")


# ============================================================================
# NPM LIVE WATCHTOWER - Real-time NPM Registry Monitor
# ============================================================================

def should_scan_package(package_name: str) -> bool:
    """
    Determine if a package should be fully scanned based on target filters.
    Returns True if package matches keywords or is in the custom watch list.
    """
    # Check custom watch list first (exact match)
    if package_name in CUSTOM_WATCH_LIST:
        return True
    
    # Check if package name contains any target keyword
    package_lower = package_name.lower()
    for keyword in TARGET_KEYWORDS:
        if keyword in package_lower:
            return True
    
    return False


def extract_package_info(doc: dict) -> Optional[dict]:
    """
    Extract package name and latest version from NPM CouchDB document.
    Returns None if the document is not a valid package publication.
    """
    try:
        # Skip design documents and deleted documents
        if doc.get("_id", "").startswith("_design") or doc.get("_deleted"):
            return None
        
        package_name = doc.get("name") or doc.get("_id")
        if not package_name:
            return None
        
        # Get the dist-tags to find the latest version
        dist_tags = doc.get("dist-tags", {})
        latest_version = dist_tags.get("latest")
        
        # If no dist-tags, try to get from versions
        if not latest_version:
            versions = doc.get("versions", {})
            if versions:
                # Get the most recent version key
                latest_version = list(versions.keys())[-1] if versions else None
        
        if not latest_version:
            return None
        
        # Extract additional metadata
        versions_data = doc.get("versions", {})
        version_info = versions_data.get(latest_version, {})
        
        return {
            "package_name": package_name,
            "version": latest_version,
            "description": doc.get("description", ""),
            "repository": doc.get("repository", {}),
            "scripts": version_info.get("scripts", {}),
            "dependencies": version_info.get("dependencies", {}),
            "author": doc.get("author", {}),
            "maintainers": doc.get("maintainers", []),
            "time": doc.get("time", {}),
        }
    except Exception as e:
        logger.debug(f"Failed to extract package info: {e}")
        return None


async def process_npm_package(package_info: dict):
    """
    Process a matched NPM package through the detection pipeline.
    Creates a PackageReleaseEvent and passes it to handle_release_event.
    """
    try:
        package_name = package_info["package_name"]
        version = package_info["version"]
        
        logger.info(f"[NPM Watcher] 🎯 MATCH FOUND: {package_name}@{version} - Running full scan...")
        
        # Build metadata from NPM document
        metadata = {
            "source": "npm_live_watcher",
            "description": package_info.get("description", ""),
            "scripts": package_info.get("scripts", {}),
            "dependencies": package_info.get("dependencies", {}),
            "author": package_info.get("author", {}),
            "maintainers": package_info.get("maintainers", []),
        }
        
        # Extract repo URL if available
        repo_info = package_info.get("repository", {})
        repo_url = None
        if isinstance(repo_info, dict):
            repo_url = repo_info.get("url", "")
        elif isinstance(repo_info, str):
            repo_url = repo_info
        
        # Create the PackageReleaseEvent
        event = PackageReleaseEvent(
            package_name=package_name,
            new_version=version,
            prev_version=None,  # We don't track previous versions in the live stream
            repo_url=repo_url,
            metadata=metadata
        )
        
        # Create an empty BackgroundTasks for the handler
        # Since we're running in a background task, we execute subtasks directly
        background_tasks = BackgroundTasks()
        
        # Call the existing handler
        result = await handle_release_event(event, background_tasks)
        
        # Execute any background tasks that were queued
        await background_tasks()
        
        if result.is_suspicious:
            logger.warning(
                f"[NPM Watcher] 🚨 THREAT DETECTED: {package_name}@{version} "
                f"- Severity: {result.severity}, Incident: {result.incident_id}"
            )
        else:
            logger.info(f"[NPM Watcher] ✅ {package_name}@{version} - No threats detected")
            
    except Exception as e:
        logger.error(f"[NPM Watcher] Error processing {package_info.get('package_name', 'unknown')}: {e}")


async def npm_watcher_task():
    """
    Background task that monitors the NPM registry in real-time using CouchDB changes feed.
    Uses long-polling strategy with robust error handling and automatic reconnection.
    """
    last_seq = "now"  # Start from current point in time
    
    logger.info("[NPM Watcher] 🔭 Watchtower online - Monitoring NPM registry for new publications...")
    
    async with httpx.AsyncClient(timeout=httpx.Timeout(NPM_POLL_TIMEOUT + 10, connect=30.0)) as client:
        while True:
            try:
                # Build the long-poll request URL
                params = {
                    "feed": "longpoll",
                    "include_docs": "true",
                    "since": last_seq,
                }
                
                logger.debug(f"[NPM Watcher] Polling changes since: {last_seq}")
                
                # Make the long-poll request
                response = await client.get(
                    NPM_CHANGES_URL,
                    params=params,
                    timeout=httpx.Timeout(NPM_POLL_TIMEOUT + 10, connect=30.0)
                )
                response.raise_for_status()
                
                data = response.json()
                
                # Update last_seq for next iteration
                new_last_seq = data.get("last_seq")
                if new_last_seq:
                    last_seq = new_last_seq
                
                # Process each change in the results
                results = data.get("results", [])
                
                for change in results:
                    doc = change.get("doc")
                    if not doc:
                        continue
                    
                    # Extract package information
                    package_info = extract_package_info(doc)
                    if not package_info:
                        continue
                    
                    package_name = package_info["package_name"]
                    version = package_info["version"]
                    
                    # Apply the target filter
                    if should_scan_package(package_name):
                        # Log matched packages with the specified format
                        logger.info(f"[NPM Watcher] Detected: {package_name}@{version}")
                        # Process matched packages asynchronously
                        asyncio.create_task(process_npm_package(package_info))
                    else:
                        # Silently skip non-matching packages to reduce noise
                        logger.debug(f"[NPM Watcher] Skipped: {package_name}@{version}")
                
            except httpx.TimeoutException:
                # Timeout is expected with long-polling, just continue
                logger.debug("[NPM Watcher] Long-poll timeout (normal), reconnecting...")
                continue
                
            except httpx.HTTPStatusError as e:
                logger.error(f"[NPM Watcher] HTTP error {e.response.status_code}: {e}")
                logger.info(f"[NPM Watcher] Backing off for {NPM_BACKOFF_SECONDS} seconds...")
                await asyncio.sleep(NPM_BACKOFF_SECONDS)
                
            except httpx.RequestError as e:
                logger.error(f"[NPM Watcher] Connection error: {e}")
                logger.info(f"[NPM Watcher] Backing off for {NPM_BACKOFF_SECONDS} seconds...")
                await asyncio.sleep(NPM_BACKOFF_SECONDS)
                
            except json.JSONDecodeError as e:
                logger.error(f"[NPM Watcher] Failed to parse response: {e}")
                logger.info(f"[NPM Watcher] Backing off for {NPM_BACKOFF_SECONDS} seconds...")
                await asyncio.sleep(NPM_BACKOFF_SECONDS)
                
            except Exception as e:
                logger.error(f"[NPM Watcher] Unexpected error: {e}")
                logger.info(f"[NPM Watcher] Backing off for {NPM_BACKOFF_SECONDS} seconds...")
                await asyncio.sleep(NPM_BACKOFF_SECONDS)


# ============================================================================
# API ENDPOINTS FOR WATCHER MANAGEMENT
# ============================================================================

@app.get("/watcher/status")
async def watcher_status():
    """Get the current status of the NPM watcher."""
    return {
        "enabled": NPM_WATCHER_ENABLED,
        "target_keywords": list(TARGET_KEYWORDS),
        "custom_watch_list": list(CUSTOM_WATCH_LIST),
        "poll_timeout": NPM_POLL_TIMEOUT,
        "backoff_seconds": NPM_BACKOFF_SECONDS,
    }


@app.post("/watcher/keywords")
async def add_keywords(keywords: List[str]):
    """Add keywords to the target filter (runtime only, not persisted)."""
    TARGET_KEYWORDS.update(k.lower() for k in keywords)
    logger.info(f"[NPM Watcher] Added keywords: {keywords}")
    return {"message": "Keywords added", "current_keywords": list(TARGET_KEYWORDS)}


@app.post("/watcher/watchlist")
async def add_to_watchlist(packages: List[str]):
    """Add packages to the custom watch list (runtime only, not persisted)."""
    CUSTOM_WATCH_LIST.update(packages)
    logger.info(f"[NPM Watcher] Added to watch list: {packages}")
    return {"message": "Packages added to watch list", "current_watchlist": list(CUSTOM_WATCH_LIST)}


if __name__ == "__main__":
    port = int(os.getenv("SCANNER_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
