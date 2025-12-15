@echo off
REM Development script for Simulator Mode (Windows)
REM Runs all services locally without Docker

echo Starting Swarm Shield in SIMULATOR mode...
echo.

set MODE=SIMULATOR
set DATABASE_URL=sqlite:///./data.db
set GATEWAY_URL=http://localhost:8000
set SCANNER_URL=http://localhost:8001
set VERIFIER_URL=http://localhost:8002

REM Create virtual environment if not exists
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install dependencies
echo Installing Python dependencies...
pip install -q -r packages\shared\requirements.txt
pip install -q -r services\gateway-api\requirements.txt

echo.
echo Starting services...

start "Gateway API" cmd /k "cd services\gateway-api && set MODE=SIMULATOR && set DATABASE_URL=sqlite:///./data.db && set SCANNER_URL=http://localhost:8001 && set VERIFIER_URL=http://localhost:8002 && python main.py"
timeout /t 3 /nobreak > nul

start "Verifier Agent" cmd /k "cd services\verifier-agent && set MODE=SIMULATOR && set GATEWAY_URL=http://localhost:8000 && python main.py"
timeout /t 2 /nobreak > nul

start "Scanner Agent" cmd /k "cd services\scanner-agent && set MODE=SIMULATOR && set GATEWAY_URL=http://localhost:8000 && set VERIFIER_URL=http://localhost:8002 && python main.py"
timeout /t 1 /nobreak > nul

start "CI Agent" cmd /k "cd services\ci-agent && set MODE=SIMULATOR && set GATEWAY_URL=http://localhost:8000 && python main.py"
timeout /t 1 /nobreak > nul

start "Patch Agent" cmd /k "cd services\patch-agent && set MODE=SIMULATOR && set GATEWAY_URL=http://localhost:8000 && python main.py"
timeout /t 1 /nobreak > nul

echo.
echo ✅ All services started!
echo.
echo Services running:
echo   - Gateway API:    http://localhost:8000
echo   - Scanner Agent:  http://localhost:8001
echo   - Verifier Agent: http://localhost:8002
echo   - Patch Agent:    http://localhost:8003
echo   - CI Agent:       http://localhost:8004
echo.
echo To start the dashboard:
echo   cd apps\dashboard ^&^& npm install ^&^& npm run dev
echo.
pause
