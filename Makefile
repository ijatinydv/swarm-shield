.PHONY: dev dev-docker test clean install

# Install all dependencies
install:
	python -m venv .venv
	.venv/Scripts/pip install -r packages/shared/requirements.txt
	.venv/Scripts/pip install -r services/gateway-api/requirements.txt
	.venv/Scripts/pip install -r tests/requirements.txt
	cd apps/dashboard && npm install

# Run in simulator mode (local)
dev:
	./scripts/dev_simulator.sh

# Run with Docker
dev-docker:
	cd infra && docker compose up --build

# Run tests
test:
	.venv/Scripts/pytest tests/ -v

# Clean build artifacts
clean:
	rm -rf .venv
	rm -rf apps/dashboard/node_modules
	rm -rf apps/dashboard/dist
	rm -f *.db
	find . -type d -name __pycache__ -exec rm -rf {} +
