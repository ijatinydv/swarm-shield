# Demo Script - Swarm Shield

This script walks through a complete demo of the Dependency Swarm Shield system. Total time: ~5 minutes.

## Prerequisites

Ensure all services are running:
```bash
# Option A: Docker (recommended)
cd infra && docker compose up --build

# Option B: Local development
./scripts/dev_simulator.sh  # or dev_simulator.bat on Windows
# Then in another terminal:
cd apps/dashboard && npm install && npm run dev
```

## Demo Flow

### Step 1: Open the Dashboard (30 seconds)

1. Open http://localhost:3000 in your browser
2. You'll see the Security Operations Center dashboard
3. Note the "Simulator Mode" indicator in the header
4. The dashboard shows: 0 incidents, 4 active agents (Scanner, Verifier, CI, Patch)

### Step 2: View Registered Agents (1 minute)

1. Click **"Agents"** in the navigation
2. You'll see 4 agents registered:
   - **Scanner Agent** - capabilities: security_scan, dependency_analysis
   - **Verifier Agent** - capabilities: security_verify, incident_response
   - **CI Agent** - capabilities: ci_policy, release_gatekeeping
   - **Patch Agent** - capabilities: autofix, patch_planner
3. Each agent shows its DID (Decentralized Identifier) and status

### Step 3: Trigger a Typosquat Attack (1 minute)

1. Return to **Dashboard**
2. Click the **"Typosquat"** button in the Demo Scenarios section
3. Watch the dashboard update:
   - A new incident appears for `lodash-utils@1.0.1`
   - Severity: CRITICAL
   - Status changes: detected → verified
4. Click the incident to see details

### Step 4: Examine the Incident Timeline (1 minute)

1. On the incident detail page, observe:
   - **Timeline**: Shows detection → verification flow
   - **Risk Indicators**: Typosquat detection with confidence score
   - **Trust Credentials**:
     - RiskFindingCredential (from Scanner)
     - VerifiedIncidentCredential (from Verifier)
     - SafeToUseAttestation for v1.0.0 (safe version)
2. Note the signature verification status for each credential

### Step 5: Test the CI Gate (1 minute)

1. Click **"CI Gate"** in the navigation
2. Test the malicious version:
   - Enter: `lodash-utils` version `1.0.1`
   - Click **Check Package**
   - Result: **BLOCKED** - No valid SafeToUseAttestation
3. Test the safe version:
   - Enter: `lodash-utils` version `1.0.0`
   - Click **Check Package**
   - Result: **ALLOWED** - Has valid attestation from verifier
4. Test an unknown package:
   - Enter: `lodash` version `4.17.21`
   - Result: **ALLOWED** - No incidents (default policy)

### Step 6: Trigger Additional Scenarios (30 seconds)

Return to Dashboard and try:

1. **Malicious Scripts** - Detects dangerous postinstall scripts
2. **Obfuscated Code** - Detects base64/encoded payloads

Each triggers the full agent workflow automatically.

## API Demo Commands

For CLI demonstrations:

```bash
# Trigger a demo incident
curl -X POST http://localhost:8000/demo/trigger \
  -H "Content-Type: application/json" \
  -d '{"package_name": "lodash-utils", "scenario": "typosquat"}'

# Check CI gate for malicious version (BLOCKED)
curl -X POST http://localhost:8004/ci/check-update \
  -H "Content-Type: application/json" \
  -d '{"project_id": "demo", "package_name": "lodash-utils", "version": "1.0.1"}'

# Check CI gate for safe version (ALLOWED)
curl -X POST http://localhost:8004/ci/check-update \
  -H "Content-Type: application/json" \
  -d '{"project_id": "demo", "package_name": "lodash-utils", "version": "1.0.0"}'

# List all incidents
curl http://localhost:8000/incidents

# List all credentials
curl http://localhost:8000/credentials

# List all agents
curl http://localhost:8000/agents

# Verify a specific credential
curl http://localhost:8000/credentials/{credential_id}/verify
```

## Key Points to Highlight

1. **Decentralized Trust**: Each agent has its own DID identity
2. **Verifiable Credentials**: All attestations are cryptographically signed
3. **Agent Discovery**: Agents find each other by capabilities, not hardcoded endpoints
4. **Automated Workflow**: Detection → Verification → Attestation happens automatically
5. **CI Integration**: Build decisions based on verifiable trust artifacts
6. **Dual Mode**: Same code works in simulator (offline) and Zynd (network) modes

## Troubleshooting

- **No agents showing**: Wait 5-10 seconds for agents to register
- **Incidents not updating**: Refresh the page or check service logs
- **CI check fails**: Ensure ci-agent is running on port 8004
