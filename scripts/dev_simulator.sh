#!/bin/bash
# Development script for Simulator Mode
# Runs all services locally without Docker

set -e

echo "Starting Swarm Shield in SIMULATOR mode..."
echo ""

export MODE=SIMULATOR
export DATABASE_URL="sqlite:///./data.db"
export GATEWAY_URL="http://localhost:8000"
export SCANNER_URL="http://localhost:8001"
export VERIFIER_URL="http://localhost:8002"

# Create virtual environment if not exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -q -r packages/shared/requirements.txt
pip install -q -r services/gateway-api/requirements.txt

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
echo "Starting services..."

cd services/gateway-api && python main.py &
sleep 3

cd $OLDPWD/../verifier-agent && python main.py &
sleep 2

cd $OLDPWD/../scanner-agent && python main.py &
sleep 1

cd $OLDPWD/../ci-agent && python main.py &
sleep 1

cd $OLDPWD/../patch-agent && python main.py &
sleep 1

echo ""
echo "All services started!"
echo ""
echo "Services running:"
echo "  - Gateway API:    http://localhost:8000"
echo "  - Scanner Agent:  http://localhost:8001"
echo "  - Verifier Agent: http://localhost:8002"
echo "  - Patch Agent:    http://localhost:8003"
echo "  - CI Agent:       http://localhost:8004"
echo ""
echo "To start the dashboard:"
echo "  cd apps/dashboard && npm install && npm run dev"
echo ""
echo "Press Ctrl+C to stop all services"

wait
