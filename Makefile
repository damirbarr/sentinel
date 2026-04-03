.PHONY: install dev frontend backend mock mock-2 mock-simulator mock-n demo test test-backend test-mock clean venv-setup venv-check

# ── Config ────────────────────────────────────────────────────────────────────
VEHICLE_ID      ?= vehicle-001
BACKEND_URL     ?= ws://localhost:3001/ws/sentinels
START_LAT       ?= 37.7749
START_LNG       ?= -122.4194
MAX_DISTANCE_KM ?= 1
CHAOS           ?= 0
N               ?= 3

MOCK_DIR     := sentinel-mock
VENV         := $(MOCK_DIR)/.venv
PYTHON       := $(VENV)/bin/python
PIP          := $(VENV)/bin/pip

# ── Install ───────────────────────────────────────────────────────────────────
install: install-backend install-frontend venv-setup
	@echo ""
	@echo "✓ All dependencies installed."
	@echo "  Run 'make dev' to start backend + frontend."
	@echo "  Run 'make mock VEHICLE_ID=vehicle-001' in a new terminal."

install-backend:
	@echo "→ Installing backend dependencies..."
	cd backend && npm install

install-frontend:
	@echo "→ Installing frontend dependencies..."
	cd frontend && npm install

venv-setup:
	@echo "→ Setting up Python virtual environment..."
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip -q
	$(PIP) install -r $(MOCK_DIR)/requirements.txt
	@echo "  venv ready at $(VENV)"

# ── Development ───────────────────────────────────────────────────────────────
dev:
	@echo "→ Starting Sentinel (backend + frontend in parallel)"
	$(MAKE) -j2 backend frontend

backend:
	cd backend && npm run dev

frontend:
	cd frontend && npm run dev

# ── Mock vehicles ─────────────────────────────────────────────────────────────
mock: venv-check
	cd $(MOCK_DIR) && ../$(PYTHON) -m sentinel.main \
		--vehicle-id $(VEHICLE_ID) \
		--backend-url $(BACKEND_URL) \
		--lat $(START_LAT) \
		--lng $(START_LNG) \
		$(if $(filter-out 0,$(MAX_DISTANCE_KM)),--max-constraint-distance $(MAX_DISTANCE_KM),) \
		$(if $(filter 1,$(CHAOS)),--chaos,)

mock-2: venv-check
	$(MAKE) -j2 \
		"mock VEHICLE_ID=vehicle-001 START_LAT=37.7749 START_LNG=-122.4194" \
		"mock VEHICLE_ID=vehicle-002 START_LAT=37.7849 START_LNG=-122.4094"

mock-n: venv-check
	@echo "→ Spawning $(N) mock vehicles (chaos=$(CHAOS))..."
	@$(PYTHON) scripts/spawn_mocks.py \
		--n $(N) \
		--python $(abspath $(PYTHON)) \
		--backend-url $(BACKEND_URL) \
		--max-distance $(MAX_DISTANCE_KM) \
		$(if $(filter 1,$(CHAOS)),--chaos,)

demo:
	@echo "→ Starting Sentinel demo (backend + frontend + $(N) vehicles, chaos=1)"
	@trap 'kill 0' INT TERM; \
	$(MAKE) backend & \
	sleep 2 && $(MAKE) frontend & \
	sleep 4 && $(MAKE) mock-n N=$(N) CHAOS=1; \
	wait

mock-simulator:
	@echo "Mock Simulator UI: http://localhost:3001/mock-simulator"
	@echo "(Start the backend first with 'make dev')"

# ── Tests ─────────────────────────────────────────────────────────────────────
test: test-backend test-mock

test-backend:
	cd backend && npm test

test-mock: venv-check
	cd $(MOCK_DIR) && ../$(PYTHON) -m pytest tests/ -v

# ── Helpers ───────────────────────────────────────────────────────────────────
venv-check:
	@test -f $(PYTHON) || (echo "ERROR: Python venv not found. Run 'make venv-setup' first." && exit 1)

# ── Clean ─────────────────────────────────────────────────────────────────────
clean:
	@echo "→ Cleaning build artifacts..."
	rm -rf backend/dist backend/node_modules
	rm -rf frontend/dist frontend/node_modules
	rm -rf $(MOCK_DIR)/.venv
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	@echo "✓ Clean complete."
