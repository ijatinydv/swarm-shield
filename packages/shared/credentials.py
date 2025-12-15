import hashlib
import hmac
import json
from datetime import datetime
from typing import Dict, Any, Optional
from .models import Credential, CredentialType, generate_id


SECRET_KEY = b"swarm-shield-demo-key-2024"


def create_proof(credential_data: Dict[str, Any], issuer_did: str) -> Dict[str, Any]:
    """Create HMAC-based proof for credential."""
    canonical = json.dumps(credential_data, sort_keys=True, default=str)
    signature = hmac.new(SECRET_KEY, canonical.encode(), hashlib.sha256).hexdigest()
    return {
        "type": "HmacSignature2024",
        "created": datetime.utcnow().isoformat(),
        "verificationMethod": f"{issuer_did}#key-1",
        "signature": signature
    }


def verify_proof(credential: Credential) -> bool:
    """Verify HMAC-based proof."""
    if not credential.proof or "signature" not in credential.proof:
        return False
    
    cred_data = credential.dict(exclude={"proof"})
    canonical = json.dumps(cred_data, sort_keys=True, default=str)
    expected = hmac.new(SECRET_KEY, canonical.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(credential.proof["signature"], expected)


def create_risk_finding_credential(
    issuer_did: str,
    package_name: str,
    version: str,
    incident_id: str,
    reasons: list[str],
    confidence: float,
    evidence_hashes: list[str]
) -> Credential:
    cred_data = {
        "id": generate_id(),
        "type": CredentialType.RISK_FINDING.value,
        "issuer_did": issuer_did,
        "subject": {
            "package_name": package_name,
            "version": version,
            "incident_id": incident_id
        },
        "issuance_date": datetime.utcnow().isoformat(),
        "claims": {
            "reasons": reasons,
            "confidence": confidence,
            "evidence_hashes": evidence_hashes
        }
    }
    proof = create_proof(cred_data, issuer_did)
    return Credential(**cred_data, proof=proof)


def create_verified_incident_credential(
    issuer_did: str,
    package_name: str,
    version: str,
    incident_id: str,
    original_finding_id: str,
    verification_notes: str
) -> Credential:
    cred_data = {
        "id": generate_id(),
        "type": CredentialType.VERIFIED_INCIDENT.value,
        "issuer_did": issuer_did,
        "subject": {
            "package_name": package_name,
            "version": version,
            "incident_id": incident_id,
            "original_finding_id": original_finding_id
        },
        "issuance_date": datetime.utcnow().isoformat(),
        "claims": {
            "verification_status": "confirmed",
            "notes": verification_notes
        }
    }
    proof = create_proof(cred_data, issuer_did)
    return Credential(**cred_data, proof=proof)


def create_false_positive_credential(
    issuer_did: str,
    package_name: str,
    version: str,
    incident_id: str,
    original_finding_id: str,
    reason: str
) -> Credential:
    cred_data = {
        "id": generate_id(),
        "type": CredentialType.FALSE_POSITIVE.value,
        "issuer_did": issuer_did,
        "subject": {
            "package_name": package_name,
            "version": version,
            "incident_id": incident_id,
            "original_finding_id": original_finding_id
        },
        "issuance_date": datetime.utcnow().isoformat(),
        "claims": {
            "determination": "false_positive",
            "reason": reason
        }
    }
    proof = create_proof(cred_data, issuer_did)
    return Credential(**cred_data, proof=proof)


def create_safe_to_use_attestation(
    issuer_did: str,
    package_name: str,
    version: str,
    incident_id: Optional[str],
    expiration_hours: int = 24
) -> Credential:
    from datetime import timedelta
    
    issuance = datetime.utcnow()
    expiration = issuance + timedelta(hours=expiration_hours)
    
    cred_data = {
        "id": generate_id(),
        "type": CredentialType.SAFE_TO_USE.value,
        "issuer_did": issuer_did,
        "subject": {
            "package_name": package_name,
            "version": version,
            "incident_id": incident_id
        },
        "issuance_date": issuance.isoformat(),
        "expiration_date": expiration.isoformat(),
        "claims": {
            "attestation": "safe_to_use",
            "scope": "version_specific"
        }
    }
    proof = create_proof(cred_data, issuer_did)
    return Credential(
        **cred_data,
        expiration_date=expiration,
        proof=proof
    )
