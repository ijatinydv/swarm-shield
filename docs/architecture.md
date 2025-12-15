# Architecture - Swarm Shield

## System Overview

Swarm Shield is a decentralized multi-agent system for detecting and responding to malicious dependency releases. It demonstrates:

- **Agent Identity**: DID-based identity management
- **Agent Discovery**: Capability-based service discovery
- **Secure Messaging**: Encrypted agent-to-agent communication
- **Verifiable Credentials**: Trust artifacts that can be cryptographically verified

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            User Interface                                │
│                    React Dashboard (SOC Theme)                           │
│   ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐                  │
│   │Dashboard│  │Incidents │  │ Agents  │  │ CI Gate  │                  │
│   └─────────┘  └──────────┘  └─────────┘  └──────────┘                  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ REST API
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Gateway API (FastAPI)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │   Incidents  │  │ Credentials  │  │    Agents    │                   │
│  │    Store     │  │   Registry   │  │   Registry   │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                           │                                              │
│                    SQLite Database                                       │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ Transport Layer
                                  │ (Simulator: In-Memory / Zynd: MQTT)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Agent Swarm                                     │
│                                                                          │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │  Scanner Agent  │────▶│ Verifier Agent  │────▶│    CI Agent     │   │
│  │                 │     │                 │     │                 │   │
│  │ • Typosquat     │     │ • Re-verify     │     │ • Policy check  │   │
│  │ • Scripts check │     │ • Issue VCs     │     │ • Allow/block   │   │
│  │ • Obfuscation   │     │ • Attestations  │     │ • Trust eval    │   │
│  │                 │     │                 │     │                 │   │
│  │ DID: scanner    │     │ DID: verifier   │     │ DID: ci         │   │
│  └─────────────────┘     └────────┬────────┘     └─────────────────┘   │
│                                   │                                      │
│                                   ▼                                      │
│                          ┌─────────────────┐                            │
│                          │   Patch Agent   │                            │
│                          │                 │                            │
│                          │ • Remediation   │                            │
│                          │ • PR creation   │                            │
│                          │                 │                            │
│                          │ DID: patch      │                            │
│                          └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Gateway API

**Purpose**: Central coordination point and data store

**Responsibilities**:
- REST API for dashboard
- Incident storage and retrieval
- Credential registry
- Agent registry cache
- Demo trigger endpoints

**Endpoints**:
- `GET /incidents` - List all incidents
- `GET /incidents/:id` - Get incident details
- `GET /credentials` - List credentials
- `GET /agents` - List registered agents
- `POST /demo/trigger` - Trigger demo scenarios

### 2. Scanner Agent

**Purpose**: First-line detection of suspicious packages

**Capabilities**: `security_scan`, `dependency_analysis`

**Detection Methods**:
1. **Typosquat Detection**: Levenshtein distance against popular packages
2. **Suspicious Scripts**: Detects dangerous postinstall/preinstall hooks
3. **Obfuscation Detection**: Identifies base64, hex encoding, eval() usage

**Output**: `RiskFindingCredential`

### 3. Verifier Agent

**Purpose**: Independent verification of scanner findings

**Capabilities**: `security_verify`, `incident_response`

**Workflow**:
1. Receives verification requests from scanner
2. Re-runs detection algorithms independently
3. Issues either:
   - `VerifiedIncidentCredential` (confirmed threat)
   - `FalsePositiveCredential` (not a threat)
4. Issues `SafeToUseAttestation` for safe versions

### 4. CI Agent

**Purpose**: CI/CD pipeline integration point

**Capabilities**: `ci_policy`, `release_gatekeeping`

**Decision Logic**:
```
IF active_incident AND NOT valid_attestation:
    BLOCK
ELIF valid_attestation:
    ALLOW
ELSE:
    ALLOW (default policy)
```

**Trust Requirements**:
- Valid unexpired `SafeToUseAttestation`
- Issued by trusted verifier DID
- Valid cryptographic signature

### 5. Patch Agent

**Purpose**: Remediation planning

**Capabilities**: `autofix`, `patch_planner`

**Actions**:
- Suggest version rollback
- Recommend safe alternatives
- Generate remediation steps
- Create mock GitHub PRs (optional)

## Credential Schema

### Base Credential Structure

```json
{
  "id": "uuid",
  "type": "CredentialType",
  "issuer_did": "did:simulator:agent-name",
  "subject": {
    "package_name": "string",
    "version": "string",
    "incident_id": "string"
  },
  "issuance_date": "ISO8601",
  "expiration_date": "ISO8601 (optional)",
  "claims": {},
  "proof": {
    "type": "HmacSignature2024",
    "created": "ISO8601",
    "verificationMethod": "did:...#key-1",
    "signature": "hex"
  }
}
```

### Credential Types

| Type | Issuer | Purpose |
|------|--------|---------|
| RiskFindingCredential | Scanner | Documents detected threat |
| VerifiedIncidentCredential | Verifier | Confirms threat is real |
| FalsePositiveCredential | Verifier | Marks false detection |
| SafeToUseAttestation | Verifier | Approves safe version |

## Transport Layer

### Simulator Mode

In-memory pub/sub with singleton pattern:

```python
SimulatorTransport._messages[agent_did].append(message)
```

Features:
- Deterministic routing
- No external dependencies
- Perfect for demos and testing

### Zynd Mode

Real agent network using Zynd SDK:

```python
from zyndai_agent import AgentConfig, P3AIAgent

config = AgentConfig(
    identity_credential_path=path,
    secret_seed=seed
)
agent = P3AIAgent(config)
agent.send_message(to_did, payload)
```

Features:
- Encrypted MQTT messaging
- Real DID identity
- Capability-based discovery
- Network-wide agent registry

## Data Flow

### Incident Detection Flow

```
1. PackageReleaseEvent received
              │
              ▼
2. Scanner Agent analyzes
              │
              ▼
3. RiskFindingCredential created
              │
              ▼
4. Incident stored in Gateway
              │
              ▼
5. Verifier notified via transport
              │
              ▼
6. Verifier re-analyzes
              │
              ▼
7. VerifiedIncidentCredential OR FalsePositiveCredential
              │
              ▼
8. SafeToUseAttestation for safe version
              │
              ▼
9. CI Agent can now make decisions
```

### CI Check Flow

```
1. CI requests package check
              │
              ▼
2. CI Agent queries Gateway for:
   - Active incidents
   - Valid attestations
              │
              ▼
3. Evaluate trust requirements:
   - Attestation exists?
   - Not expired?
   - Trusted issuer?
   - Valid signature?
              │
              ▼
4. Return ALLOW or BLOCK with reason
```

## Security Model

### Trust Assumptions

1. **Scanner Trust**: Detections are best-effort, may have false positives
2. **Verifier Trust**: Must be in trusted DID list for attestations to be accepted
3. **Signature Trust**: HMAC signatures (demo) or SDK signatures (production)

### Verification Steps

1. Proof signature matches credential content
2. Issuer DID is in trusted list
3. Credential not expired
4. Subject matches query parameters

## Extensibility

### Adding New Agents

1. Create new service in `services/`
2. Define capabilities
3. Register with transport layer
4. Implement message handlers

### Adding New Detection Rules

1. Add detection function in `packages/shared/detection.py`
2. Update `analyze_package_release()`
3. Scanner will automatically use new rules

### Adding New Credential Types

1. Add type to `CredentialType` enum
2. Create credential factory function
3. Update verification logic as needed
