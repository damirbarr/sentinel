# Sentinel

A map-first fleet monitoring and control console for autonomous and teleoperated vehicles.

```
┌─────────────────────────────────────────────────────────┐
│                    Operator Browser                      │
│              React · Vite · Tailwind · Leaflet           │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket /ws/clients
┌────────────────────────▼────────────────────────────────┐
│                   Sentinel Backend                       │
│             Node.js · TypeScript · Fastify 4             │
│   REST /api/*     │   WS /ws/clients  │  WS /ws/sentinels│
└───────────────────┬─────────────────────────────────────┘
                    │ WebSocket /ws/sentinels
   ┌────────────────┼────────────────┐
   ▼                ▼                ▼
vehicle-001     vehicle-002     vehicle-N
Python asyncio mock — simulates telemetry, reacts to constraints
```

## Quick Start

**Prerequisites:** Node.js ≥ 20, Python ≥ 3.11, npm

```bash
git clone https://github.com/damirbarr/sentinel.git
cd sentinel
make install     # installs backend, frontend deps + Python venv
```

Open three terminals:

```bash
# Terminal 1 — backend + frontend
make dev

# Terminal 2 — first mock vehicle
make mock VEHICLE_ID=vehicle-001

# Terminal 3 — second mock vehicle (optional)
make mock VEHICLE_ID=vehicle-002 START_LAT=37.7849 START_LNG=-122.4094
```

Open http://localhost:5173

## Make Targets

| Target | Description |
|--------|-------------|
| `make install` | Install all dependencies (backend, frontend, Python venv) |
| `make dev` | Start backend and frontend in parallel |
| `make backend` | Start backend only (`localhost:3001`) |
| `make frontend` | Start frontend only (`localhost:5173`) |
| `make mock` | Start one mock vehicle (see params below) |
| `make mock-2` | Start two mock vehicles in parallel |
| `make test` | Run all tests (backend + Python) |
| `make test-backend` | Run Vitest unit tests |
| `make test-mock` | Run pytest unit tests |
| `make clean` | Remove build artifacts and venv |

### Mock vehicle parameters

```bash
make mock VEHICLE_ID=my-van START_LAT=37.77 START_LNG=-122.42
```

| Param | Default | Description |
|-------|---------|-------------|
| `VEHICLE_ID` | `vehicle-001` | Unique vehicle identifier |
| `BACKEND_URL` | `ws://localhost:3001/ws/sentinels` | Backend WS URL |
| `START_LAT` | `37.7749` | Initial latitude |
| `START_LNG` | `-122.4194` | Initial longitude |

## Demo Loop

1. Open the UI — vehicles appear on the San Francisco map within 2 s
2. Click **Constraints → Weather**, set a severe storm, click **Publish**
3. Watch vehicles switch to `DEGRADED_SPEED` or `SAFE_STOP_RECOMMENDED`
4. Draw a **Geofence** polygon on the map (Constraints → Geofence tab → Draw)
5. Set zone type **FORBIDDEN** and publish — vehicles inside reroute
6. Open the **Timeline** panel (bottom) to see every event in order
7. Click a vehicle to inspect telemetry, active constraints, and reason codes

## Decision Model

| State | Trigger |
|-------|---------|
| `NORMAL` | No active constraints affecting this vehicle |
| `DEGRADED_SPEED` | Low-severity weather or SLOW geofence zone |
| `SAFE_STOP_RECOMMENDED` | High-severity weather, inside CAUTION geofence, or network outage |
| `REROUTE_RECOMMENDED` | Inside FORBIDDEN geofence |

When multiple factors are active simultaneously, reason code `MULTI_FACTOR_RISK` is appended.

## Project Structure

```
sentinel/
├── Makefile
├── backend/               # Node.js + TypeScript + Fastify 4
│   └── src/
│       ├── config.ts
│       ├── server.ts
│       ├── index.ts
│       ├── broadcast/
│       ├── ws/
│       └── domains/
│           ├── events/
│           ├── vehicles/
│           └── timeline/
├── frontend/              # React + Vite + Tailwind + Leaflet
│   └── src/
│       ├── api/
│       ├── components/
│       │   ├── control/
│       │   ├── layout/
│       │   ├── map/
│       │   ├── timeline/
│       │   ├── ui/
│       │   └── vehicle/
│       ├── hooks/
│       ├── store/
│       └── types/
└── sentinel-mock/         # Python asyncio mock vehicles
    └── sentinel/
        ├── config.py
        ├── main.py
        ├── models/
        ├── policy/
        ├── reporting/
        ├── simulation/
        ├── transport/
        └── tests/
```

## API Reference

### REST

| Method | Path | Body / Response |
|--------|------|-----------------|
| `GET` | `/api/vehicles` | `VehicleStatus[]` |
| `GET` | `/api/vehicles/:id` | `VehicleStatus` |
| `GET` | `/api/events` | `ActiveEvent[]` |
| `POST` | `/api/events` | `CreateEventInput` → `ActiveEvent` |
| `DELETE` | `/api/events/:id` | `{ cleared: true }` |

### WebSocket messages (server → frontend)

| Type | Payload |
|------|---------|
| `INIT_STATE` | Full snapshot on connect |
| `VEHICLE_UPDATED` | Single vehicle state change |
| `EVENT_PUBLISHED` | New constraint activated |
| `EVENT_CLEARED` | Constraint removed |
| `TIMELINE_ENTRY` | New timeline log line |

### WebSocket messages (mock → server)

| Type | Direction | Description |
|------|-----------|-------------|
| `REGISTER` | mock → server | Vehicle joins, receives active constraints |
| `STATUS_UPDATE` | mock → server | Periodic telemetry report |
| `EVENT_REPORT` | mock → server | Vehicle reports a self-detected event |
| `CONSTRAINT_UPDATE` | server → mock | Push new/cleared constraints |
