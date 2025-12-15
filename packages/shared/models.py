from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import uuid


def generate_id() -> str:
    return str(uuid.uuid4())


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IncidentStatus(str, Enum):
    DETECTED = "detected"
    VERIFIED = "verified"
    FALSE_POSITIVE = "false_positive"
    MITIGATED = "mitigated"


class CredentialType(str, Enum):
    RISK_FINDING = "RiskFindingCredential"
    VERIFIED_INCIDENT = "VerifiedIncidentCredential"
    FALSE_POSITIVE = "FalsePositiveCredential"
    SAFE_TO_USE = "SafeToUseAttestation"


class PackageReleaseEvent(BaseModel):
    id: str = Field(default_factory=generate_id)
    package_name: str
    new_version: str
    prev_version: Optional[str] = None
    repo_url: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RiskIndicator(BaseModel):
    type: str
    description: str
    confidence: float
    evidence: Optional[str] = None


class Credential(BaseModel):
    id: str = Field(default_factory=generate_id)
    type: CredentialType
    issuer_did: str
    subject: Dict[str, Any]
    issuance_date: datetime = Field(default_factory=datetime.utcnow)
    expiration_date: Optional[datetime] = None
    claims: Dict[str, Any] = Field(default_factory=dict)
    proof: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        use_enum_values = True


class RiskFindingCredential(Credential):
    type: CredentialType = CredentialType.RISK_FINDING


class VerifiedIncidentCredential(Credential):
    type: CredentialType = CredentialType.VERIFIED_INCIDENT


class FalsePositiveCredential(Credential):
    type: CredentialType = CredentialType.FALSE_POSITIVE


class SafeToUseAttestation(Credential):
    type: CredentialType = CredentialType.SAFE_TO_USE


class Incident(BaseModel):
    id: str = Field(default_factory=generate_id)
    package_name: str
    version: str
    severity: Severity
    status: IncidentStatus = IncidentStatus.DETECTED
    title: str
    description: str
    indicators: List[RiskIndicator] = Field(default_factory=list)
    affected_projects: List[str] = Field(default_factory=list)
    credentials: List[str] = Field(default_factory=list)  # credential IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        use_enum_values = True


class Agent(BaseModel):
    id: str = Field(default_factory=generate_id)
    did: str
    name: str
    capabilities: List[str] = Field(default_factory=list)
    endpoint: Optional[str] = None
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    status: str = "online"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PatchPlan(BaseModel):
    id: str = Field(default_factory=generate_id)
    incident_id: str
    package_name: str
    current_version: str
    recommended_version: str
    action: str  # "pin", "rollback", "replace"
    steps: List[str] = Field(default_factory=list)
    pr_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CICheckRequest(BaseModel):
    project_id: str
    package_name: str
    version: str


class CICheckResponse(BaseModel):
    allowed: bool
    reason: str
    required_credentials: List[str] = Field(default_factory=list)
    blocking_incidents: List[str] = Field(default_factory=list)


class AgentMessage(BaseModel):
    id: str = Field(default_factory=generate_id)
    from_did: str
    to_did: str
    message_type: str
    payload: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
