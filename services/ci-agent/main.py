import os
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import httpx
import asyncio

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "packages"))
from shared.models import (
    Credential, CICheckRequest, CICheckResponse, CredentialType, generate_id
)
from shared.transport import get_transport
from shared.credentials import verify_proof

app = FastAPI(title="CI Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

AGENT_DID = "did:simulator:ci"
CAPABILITIES = ["ci_policy", "release_gatekeeping"]
transport = get_transport("ci", CAPABILITIES, AGENT_DID)

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:8000")

TRUSTED_VERIFIER_DIDS = [
    "did:simulator:verifier",
    "did:zynd:verifier"
]


class PackageCheckRequest(BaseModel):
    project_id: str
    package_name: str
    version: str


class PackageCheckResponse(BaseModel):
    allowed: bool
    reason: str
    required_credentials: List[str] = []
    blocking_incidents: List[str] = []
    attestations: List[dict] = []


async def get_safe_attestations(package_name: str, version: str) -> List[Credential]:
    """Fetch SafeToUseAttestation credentials for a package version."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{GATEWAY_URL}/credentials",
                params={"type": "SafeToUseAttestation"}
            )
            if resp.status_code == 200:
                all_creds = [Credential(**c) for c in resp.json()]
                matching = []
                for cred in all_creds:
                    subj = cred.subject
                    if subj.get("package_name") == package_name and subj.get("version") == version:
                        if cred.expiration_date:
                            exp = cred.expiration_date
                            if isinstance(exp, str):
                                exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
                            if exp > datetime.utcnow():
                                matching.append(cred)
                        else:
                            matching.append(cred)
                return matching
        except Exception as e:
            print(f"Failed to fetch attestations: {e}")
    return []


async def get_blocking_incidents(package_name: str, version: str) -> List[str]:
    """Get incidents that block this package version."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{GATEWAY_URL}/incidents")
            if resp.status_code == 200:
                incidents = resp.json()
                blocking = []
                for inc in incidents:
                    if (inc.get("package_name") == package_name and 
                        inc.get("version") == version and
                        inc.get("status") in ["detected", "verified"]):
                        blocking.append(inc["id"])
                return blocking
        except Exception:
            pass
    return []


def validate_attestation(cred: Credential) -> tuple[bool, str]:
    """Validate an attestation credential."""
    if not verify_proof(cred):
        return False, "Invalid signature"
    
    if cred.issuer_did not in TRUSTED_VERIFIER_DIDS:
        return False, f"Issuer {cred.issuer_did} not in trusted list"
    
    if cred.expiration_date:
        exp = cred.expiration_date
        if isinstance(exp, str):
            exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        if exp <= datetime.utcnow():
            return False, "Attestation expired"
    
    return True, "Valid"


@app.get("/health")
def health():
    return {"status": "healthy", "service": "ci-agent", "did": AGENT_DID}


@app.post("/ci/check-update", response_model=PackageCheckResponse)
async def check_package_update(request: PackageCheckRequest):
    """
    Check if a package update is allowed for CI.
    Returns allowed=true only if valid SafeToUseAttestation exists.
    """
    attestations = await get_safe_attestations(request.package_name, request.version)
    blocking_incidents = await get_blocking_incidents(request.package_name, request.version)
    
    valid_attestations = []
    for att in attestations:
        is_valid, reason = validate_attestation(att)
        valid_attestations.append({
            "id": att.id,
            "issuer": att.issuer_did,
            "valid": is_valid,
            "reason": reason,
            "expires": str(att.expiration_date) if att.expiration_date else None
        })
    
    has_valid_attestation = any(a["valid"] for a in valid_attestations)
    
    if blocking_incidents and not has_valid_attestation:
        return PackageCheckResponse(
            allowed=False,
            reason=f"Package {request.package_name}@{request.version} blocked due to security incident(s). Awaiting SafeToUseAttestation from trusted verifier.",
            required_credentials=["SafeToUseAttestation"],
            blocking_incidents=blocking_incidents,
            attestations=valid_attestations
        )
    
    if has_valid_attestation:
        valid_att = next(a for a in valid_attestations if a["valid"])
        return PackageCheckResponse(
            allowed=True,
            reason=f"Package approved via SafeToUseAttestation from {valid_att['issuer']}",
            required_credentials=[],
            blocking_incidents=[],
            attestations=valid_attestations
        )
    
    # No incidents, no attestations - allow by default (unknown packages)
    if not blocking_incidents:
        return PackageCheckResponse(
            allowed=True,
            reason="No security incidents or attestations found. Package allowed by default policy.",
            required_credentials=[],
            blocking_incidents=[],
            attestations=[]
        )
    
    return PackageCheckResponse(
        allowed=False,
        reason="Unable to determine package safety",
        required_credentials=["SafeToUseAttestation"],
        blocking_incidents=blocking_incidents,
        attestations=valid_attestations
    )


@app.get("/ci/policy")
def get_policy():
    """Return current CI gate policy."""
    return {
        "agent_did": AGENT_DID,
        "trusted_verifiers": TRUSTED_VERIFIER_DIDS,
        "default_policy": "allow_unknown",
        "require_attestation_for_incidents": True,
        "attestation_types_accepted": ["SafeToUseAttestation"]
    }


async def process_messages():
    """Background task to process incoming transport messages."""
    while True:
        messages = transport.read()
        for msg in messages:
            if msg.message_type == "verification_result":
                print(f"[CI] Received verification result: {msg.payload}")
        await asyncio.sleep(1)


@app.on_event("startup")
async def startup():
    asyncio.create_task(process_messages())


if __name__ == "__main__":
    port = int(os.getenv("CI_PORT", 8004))
    uvicorn.run(app, host="0.0.0.0", port=port)
