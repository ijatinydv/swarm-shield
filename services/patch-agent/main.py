import os
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import httpx
import asyncio

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "packages"))
from shared.models import Incident, PatchPlan, generate_id
from shared.transport import get_transport

app = FastAPI(title="Patch Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

AGENT_DID = "did:simulator:patch"
CAPABILITIES = ["autofix", "patch_planner"]
transport = get_transport("patch", CAPABILITIES, AGENT_DID)

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:8000")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_PR_ENABLED = os.getenv("GITHUB_PR_ENABLED", "false").lower() == "true"


class PatchRequest(BaseModel):
    incident_id: str


class PatchResponse(BaseModel):
    plan_id: str
    incident_id: str
    package_name: str
    action: str
    steps: List[str]
    pr_url: Optional[str] = None


SAFE_ALTERNATIVES = {
    "lodash-utils": {"package": "lodash", "version": "4.17.21"},
    "express-validator-utils": {"package": "express-validator", "version": "7.0.1"},
    "react-dom-helper": {"package": "react-dom", "version": "18.2.0"},
}


async def fetch_incident(incident_id: str) -> Optional[Incident]:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{GATEWAY_URL}/incidents/{incident_id}")
            if resp.status_code == 200:
                return Incident(**resp.json())
        except Exception:
            pass
    return None


async def save_patch_plan(plan: PatchPlan):
    async with httpx.AsyncClient() as client:
        try:
            # We would save to gateway, but for demo just log
            print(f"[Patch] Saved plan: {plan.id}")
        except Exception as e:
            print(f"Failed to save patch plan: {e}")


def generate_patch_steps(package_name: str, current_version: str, action: str, target: dict) -> List[str]:
    """Generate step-by-step remediation instructions."""
    steps = []
    
    if action == "replace":
        steps = [
            f"1. Remove malicious package: `npm uninstall {package_name}`",
            f"2. Install safe alternative: `npm install {target['package']}@{target['version']}`",
            f"3. Update imports in your code: replace `require('{package_name}')` with `require('{target['package']}')`",
            "4. Run tests to verify functionality",
            "5. Commit changes with message: 'Security: Replace malicious dependency'"
        ]
    elif action == "rollback":
        prev_version = current_version.rsplit(".", 1)[0] + ".0"
        steps = [
            f"1. Pin to previous safe version: `npm install {package_name}@{prev_version}`",
            f"2. Add to package.json: `\"{package_name}\": \"{prev_version}\"`",
            "3. Run `npm audit` to verify no remaining vulnerabilities",
            "4. Commit changes with message: 'Security: Pin to safe version'"
        ]
    elif action == "remove":
        steps = [
            f"1. Remove the package: `npm uninstall {package_name}`",
            "2. Search codebase for imports: `grep -r \"require('{package_name}')\" .`",
            "3. Replace with alternative implementation or remove unused code",
            "4. Run tests to verify nothing breaks",
            "5. Commit changes with message: 'Security: Remove vulnerable dependency'"
        ]
    
    return steps


def create_mock_pr_url(package_name: str, incident_id: str) -> str:
    """Generate a mock GitHub PR URL for demo."""
    return f"https://github.com/your-org/your-repo/pull/{hash(incident_id) % 1000 + 1}"


@app.get("/health")
def health():
    return {"status": "healthy", "service": "patch-agent", "did": AGENT_DID}


@app.post("/patch/plan", response_model=PatchResponse)
async def create_patch_plan(request: PatchRequest, background_tasks: BackgroundTasks):
    """Create a remediation plan for a security incident."""
    incident = await fetch_incident(request.incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    package_name = incident.package_name
    current_version = incident.version
    
    # Determine best remediation action
    if package_name in SAFE_ALTERNATIVES:
        action = "replace"
        target = SAFE_ALTERNATIVES[package_name]
        recommended_version = f"{target['package']}@{target['version']}"
    else:
        action = "rollback"
        target = {"version": current_version.rsplit(".", 1)[0] + ".0"}
        recommended_version = target["version"]
    
    steps = generate_patch_steps(package_name, current_version, action, target)
    
    # Mock PR URL if enabled
    pr_url = None
    if GITHUB_PR_ENABLED and GITHUB_TOKEN:
        pr_url = create_mock_pr_url(package_name, request.incident_id)
    else:
        pr_url = create_mock_pr_url(package_name, request.incident_id) + " (mock)"
    
    plan = PatchPlan(
        incident_id=request.incident_id,
        package_name=package_name,
        current_version=current_version,
        recommended_version=recommended_version,
        action=action,
        steps=steps,
        pr_url=pr_url
    )
    
    background_tasks.add_task(save_patch_plan, plan)
    
    return PatchResponse(
        plan_id=plan.id,
        incident_id=request.incident_id,
        package_name=package_name,
        action=action,
        steps=steps,
        pr_url=pr_url
    )


@app.get("/patch/alternatives")
def get_alternatives():
    """Get list of known safe alternatives."""
    return SAFE_ALTERNATIVES


async def process_messages():
    """Background task to process incoming transport messages."""
    while True:
        messages = transport.read()
        for msg in messages:
            if msg.message_type == "patch_request":
                incident_id = msg.payload.get("incident_id")
                if incident_id:
                    request = PatchRequest(incident_id=incident_id)
                    await create_patch_plan(request, BackgroundTasks())
        await asyncio.sleep(1)


@app.on_event("startup")
async def startup():
    asyncio.create_task(process_messages())


if __name__ == "__main__":
    port = int(os.getenv("PATCH_PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)
