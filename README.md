# Dependency Swarm Shield

A decentralized multi-agent network that detects suspicious dependency releases and blocks CI unless trusted agents issue verifiable "Safe-to-Use" attestations.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Dashboard (React)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Gateway API (FastAPI)                       │
│         REST API, Incident Store, Credential Registry            │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐       ┌───────────────┐
│ Scanner Agent │      │Verifier Agent │       │   CI Agent    │
│  (Detection)  │◄────►│ (Validation)  │◄─────►│  (Gatekeeper) │
└───────────────┘      └───────────────┘       └───────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ┌───────────────────────┐
                    │    Patch Agent        │
                    │  (Remediation Plan)   │
                    └───────────────────────┘
```

## Features

- **Agent Identity**: DID-based identity with verifiable credentials
- **Agent Discovery**: Find agents by capabilities
- **Secure Messaging**: MQTT-based agent communication (real or simulated)
- **Trust Artifacts**: Verifiable Credentials for risk findings and attestations
- **CI Integration**: Block/allow builds based on security attestations

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local dashboard dev)
- Python 3.11+ (for local backend dev)

### Run with Docker (Recommended)

```bash
# Clone and enter directory
cd swarm-shield

# Copy environment file
cp .env.example .env

# Start all services in simulator mode
docker compose up --build
```

Access the dashboard at http://localhost:3000

### Run Locally

```bash
# Terminal 1: Start backend services
./scripts/dev_simulator.sh

# Terminal 2: Start dashboard
cd apps/dashboard
npm install
npm run dev
```

## Demo Commands

### 1. Trigger a Malicious Package Event

```bash
curl -X POST http://localhost:8000/demo/trigger \
  -H "Content-Type: application/json" \
  -d '{"packageName": "lodash-utils", "scenario": "typosquat"}'
```

### 2. Check CI Gate Status

```bash
curl -X POST http://localhost:8004/ci/check-update \
  -H "Content-Type: application/json" \
  -d '{"projectId": "my-app", "packageName": "lodash-utils", "version": "1.0.1"}'
```

### 3. View All Incidents

```bash
curl http://localhost:8000/incidents
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MODE` | `SIMULATOR` or `ZYND` | `SIMULATOR` |
| `DATABASE_URL` | SQLite connection string | `sqlite:///./data.db` |
| `SCANNER_SEED` | Scanner agent secret seed (Zynd mode) | - |
| `VERIFIER_SEED` | Verifier agent secret seed (Zynd mode) | - |
| `CI_SEED` | CI agent secret seed (Zynd mode) | - |
| `PATCH_SEED` | Patch agent secret seed (Zynd mode) | - |
| `GITHUB_TOKEN` | GitHub token for PR creation | - |

## Project Structure

```
swarm-shield/
├── apps/
│   └── dashboard/              # React + Vite + Tailwind UI
├── services/
│   ├── gateway-api/            # REST API, incident store
│   ├── scanner-agent/          # Dependency scanning
│   ├── verifier-agent/         # Independent verification
│   ├── ci-agent/               # CI decision point
│   └── patch-agent/            # Remediation planning
├── packages/
│   └── shared/                 # Python shared library
├── infra/
│   ├── docker-compose.yml
│   └── mqtt/                   # MQTT broker config
├── docs/
│   ├── demo-script.md
│   └── architecture.md
└── scripts/
    ├── dev_simulator.sh
    └── dev_zynd.sh
```

## License

MIT
