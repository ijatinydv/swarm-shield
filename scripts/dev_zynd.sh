#!/bin/bash
# Development script for Zynd Mode
# Runs all services with real agent network connectivity

set -e

echo "🛡️  Starting Swarm Shield in ZYND mode..."
echo ""

# Check for required environment variables
if [ -z "$SCANNER_SEED" ] || [ -z "$SCANNER_IDENTITY_CRED_PATH" ]; then
    echo "⚠️  Warning: Scanner agent credentials not configured"
    echo "   Set SCANNER_SEED and SCANNER_IDENTITY_CRED_PATH environment variables"
fi

if [ -z "$VERIFIER_SEED" ] || [ -z "$VERIFIER_IDENTITY_CRED_PATH" ]; then
    echo "⚠️  Warning: Verifier agent credentials not configured"
    echo "   Set VERIFIER_SEED and VERIFIER_IDENTITY_CRED_PATH environment variables"
fi

export MODE=ZYND
export DATABASE_URL="sqlite:///./data.db"
export GATEWAY_URL="http://localhost:8000"

# Create virtual environment if not exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate

# Install dependencies including Zynd SDK
echo "Installing Python dependencies..."
pip install -q -r packages/shared/requirements.txt
pip install -q -r services/gateway-api/requirements.txt
pip install -q zyndai-agent==0.1.0 || echo "Warning: Could not install zyndai-agent, will fall back to simulator"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start services
echo ""
echo "Starting services in ZYND mode..."

cd services/gateway-api && python main.py &
sleep 2

cd ../scanner-agent && python main.py &
sleep 1

cd ../verifier-agent && python main.py &
sleep 1

cd ../ci-agent && python main.py &
sleep 1

cd ../patch-agent && python main.py &
sleep 1

echo ""
echo "✅ All services started in ZYND mode!"
echo ""
echo "Services running:"
echo "  - Gateway API:    http://localhost:8000"
echo "  - Scanner Agent:  http://localhost:8001"
echo "  - Verifier Agent: http://localhost:8002"
echo "  - Patch Agent:    http://localhost:8003"
echo "  - CI Agent:       http://localhost:8004"
echo ""
echo "Note: Agents will attempt to connect to the Zynd network"
echo "      Missing credentials will fall back to simulator mode"
echo ""
echo "Press Ctrl+C to stop all services"

wait
