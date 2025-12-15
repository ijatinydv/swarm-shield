import pytest
import sys
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent / "packages"))

from shared.credentials import (
    create_risk_finding_credential,
    create_verified_incident_credential,
    create_safe_to_use_attestation,
    verify_proof
)
from shared.models import CredentialType


class TestCredentialCreation:
    def test_create_risk_finding(self):
        cred = create_risk_finding_credential(
            issuer_did="did:test:scanner",
            package_name="lodash-utils",
            version="1.0.0",
            incident_id="inc-123",
            reasons=["Typosquat detected"],
            confidence=0.9,
            evidence_hashes=["abc123"]
        )
        
        assert cred.type == CredentialType.RISK_FINDING.value
        assert cred.issuer_did == "did:test:scanner"
        assert cred.subject["package_name"] == "lodash-utils"
        assert "signature" in cred.proof

    def test_create_safe_attestation(self):
        cred = create_safe_to_use_attestation(
            issuer_did="did:test:verifier",
            package_name="lodash",
            version="4.17.21",
            incident_id=None,
            expiration_hours=24
        )
        
        assert cred.type == CredentialType.SAFE_TO_USE.value
        assert cred.expiration_date is not None
        assert cred.expiration_date > datetime.utcnow()


class TestCredentialVerification:
    def test_verify_valid_credential(self):
        cred = create_risk_finding_credential(
            issuer_did="did:test:scanner",
            package_name="test-pkg",
            version="1.0.0",
            incident_id="inc-1",
            reasons=["Test"],
            confidence=0.8,
            evidence_hashes=[]
        )
        
        assert verify_proof(cred) == True

    def test_verify_tampered_credential(self):
        cred = create_risk_finding_credential(
            issuer_did="did:test:scanner",
            package_name="test-pkg",
            version="1.0.0",
            incident_id="inc-1",
            reasons=["Test"],
            confidence=0.8,
            evidence_hashes=[]
        )
        
        # Tamper with the credential
        cred.claims["reasons"] = ["Modified!"]
        
        assert verify_proof(cred) == False

    def test_verify_missing_proof(self):
        cred = create_risk_finding_credential(
            issuer_did="did:test:scanner",
            package_name="test-pkg",
            version="1.0.0",
            incident_id="inc-1",
            reasons=["Test"],
            confidence=0.8,
            evidence_hashes=[]
        )
        
        cred.proof = {}
        
        assert verify_proof(cred) == False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
