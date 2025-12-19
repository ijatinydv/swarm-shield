#!/bin/bash
# =============================================================================
# Swarm Shield - Monolith Startup Script
# =============================================================================
# This script starts all 5 backend services in a single container for
# deployment on platforms with single-container limitations (e.g., Render Free Tier).
#
# To make executable: chmod +x scripts/start_monolith.sh
# =============================================================================

set -e

echo "🚀 Starting Swarm Shield Monolith..."
echo "=================================================="

# -----------------------------------------------------------------------------
# Environment Configuration
# -----------------------------------------------------------------------------
export GATEWAY_URL="http://127.0.0.1:8000"
export VERIFIER_URL="http://127.0.0.1:8002"

# -----------------------------------------------------------------------------
# Start Gateway API (Port 8000) - Main public entrypoint
# -----------------------------------------------------------------------------
echo "📡 Starting Gateway API on port 8000..."
cd /app/services/gateway-api
uvicorn main:app --host 0.0.0.0 --port 8000 &
GATEWAY_PID=$!
echo "   Gateway API started (PID: $GATEWAY_PID)"

# Give gateway a moment to initialize
sleep 2

# -----------------------------------------------------------------------------
# Start Scanner Agent (Port 8001)
# -----------------------------------------------------------------------------
echo "🔍 Starting Scanner Agent on port 8001..."
cd /app/services/scanner-agent
GATEWAY_URL=$GATEWAY_URL VERIFIER_URL=$VERIFIER_URL uvicorn main:app --host 0.0.0.0 --port 8001 &
SCANNER_PID=$!
echo "   Scanner Agent started (PID: $SCANNER_PID)"

# -----------------------------------------------------------------------------
# Start Verifier Agent (Port 8002)
# -----------------------------------------------------------------------------
echo "✅ Starting Verifier Agent on port 8002..."
cd /app/services/verifier-agent
GATEWAY_URL=$GATEWAY_URL uvicorn main:app --host 0.0.0.0 --port 8002 &
VERIFIER_PID=$!
echo "   Verifier Agent started (PID: $VERIFIER_PID)"

# -----------------------------------------------------------------------------
# Start Patch Agent (Port 8003)
# -----------------------------------------------------------------------------
echo "🩹 Starting Patch Agent on port 8003..."
cd /app/services/patch-agent
GATEWAY_URL=$GATEWAY_URL uvicorn main:app --host 0.0.0.0 --port 8003 &
PATCH_PID=$!
echo "   Patch Agent started (PID: $PATCH_PID)"

# -----------------------------------------------------------------------------
# Start CI Agent (Port 8004)
# -----------------------------------------------------------------------------
echo "🔄 Starting CI Agent on port 8004..."
cd /app/services/ci-agent
GATEWAY_URL=$GATEWAY_URL uvicorn main:app --host 0.0.0.0 --port 8004 &
CI_PID=$!
echo "   CI Agent started (PID: $CI_PID)"

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo "=================================================="
echo "✨ All services started successfully!"
echo ""
echo "   Gateway API:     http://0.0.0.0:8000 (public)"
echo "   Scanner Agent:   http://127.0.0.1:8001"
echo "   Verifier Agent:  http://127.0.0.1:8002"
echo "   Patch Agent:     http://127.0.0.1:8003"
echo "   CI Agent:        http://127.0.0.1:8004"
echo ""
echo "=================================================="
echo "📋 Waiting for all processes..."

# -----------------------------------------------------------------------------
# Keep container alive - wait for all background processes
# -----------------------------------------------------------------------------
wait
