import pytest
import sys
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent / "packages"))

from shared.models import Credential, CredentialType
from shared.credentials import create_safe_to_use_attestation, verify_proof


# Mock CI Agent logic
TRUSTED_VERIFIER_DIDS = ["did:simulator:verifier", "did:zynd:verifier"]


def validate_attestation(cred: Credential) -> tuple[bool, str]:
    if not verify_proof(cred):
        return False, "Invalid signature"
    
    if cred.issuer_did not in TRUSTED_VERIFIER_DIDS:
        return False, f"Issuer {cred.issuer_did} not trusted"
    
    if cred.expiration_date:
        exp = cred.expiration_date
        if isinstance(exp, str):
            exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        if exp <= datetime.utcnow():
            return False, "Attestation expired"
    
    return True, "Valid"


def check_ci_decision(
    has_blocking_incident: bool,
    attestations: list[Credential]
) -> tuple[bool, str]:
    valid_attestations = [a for a in attestations if validate_attestation(a)[0]]
    
    if has_blocking_incident and not valid_attestations:
        return False, "Blocked due to incident, no valid attestation"
    
    if valid_attestations:
        return True, "Approved via attestation"
    
    if not has_blocking_incident:
        return True, "No incidents, default allow"
    
    return False, "Unable to determine safety"


class TestCIGateDecisions:
    def test_blocks_without_attestation(self):
        allowed, reason = check_ci_decision(
            has_blocking_incident=True,
            attestations=[]
        )
        assert not allowed
        assert "blocked" in reason.lower()

    def test_allows_with_valid_attestation(self):
        attestation = create_safe_to_use_attestation(
            issuer_did="did:simulator:verifier",
            package_name="test",
            version="1.0.0",
            incident_id=None,
            expiration_hours=24
        )
        
        allowed, reason = check_ci_decision(
            has_blocking_incident=True,
            attestations=[attestation]
        )
        assert allowed
        assert "approved" in reason.lower()

    def test_allows_unknown_package(self):
        allowed, reason = check_ci_decision(
            has_blocking_incident=False,
            attestations=[]
        )
        assert allowed
        assert "default" in reason.lower()

    def test_rejects_untrusted_issuer(self):
        attestation = create_safe_to_use_attestation(
            issuer_did="did:unknown:attacker",
            package_name="test",
            version="1.0.0",
            incident_id=None,
            expiration_hours=24
        )
        
        allowed, reason = check_ci_decision(
            has_blocking_incident=True,
            attestations=[attestation]
        )
        assert not allowed

    def test_rejects_expired_attestation(self):
        attestation = create_safe_to_use_attestation(
            issuer_did="did:simulator:verifier",
            package_name="test",
            version="1.0.0",
            incident_id=None,
            expiration_hours=-1  # Already expired
        )
        
        allowed, reason = check_ci_decision(
            has_blocking_incident=True,
            attestations=[attestation]
        )
        assert not allowed


class TestAttestationValidation:
    def test_valid_attestation(self):
        attestation = create_safe_to_use_attestation(
            issuer_did="did:simulator:verifier",
            package_name="test",
            version="1.0.0",
            incident_id=None
        )
        
        is_valid, reason = validate_attestation(attestation)
        assert is_valid
        assert reason == "Valid"

    def test_invalid_signature(self):
        attestation = create_safe_to_use_attestation(
            issuer_did="did:simulator:verifier",
            package_name="test",
            version="1.0.0",
            incident_id=None
        )
        attestation.proof["signature"] = "tampered"
        
        is_valid, reason = validate_attestation(attestation)
        assert not is_valid
        assert "signature" in reason.lower()

    def test_untrusted_issuer(self):
        attestation = create_safe_to_use_attestation(
            issuer_did="did:evil:hacker",
            package_name="test",
            version="1.0.0",
            incident_id=None
        )
        
        is_valid, reason = validate_attestation(attestation)
        assert not is_valid
        assert "not trusted" in reason.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
