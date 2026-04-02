# Sentinel

**A real-time fleet supervision console for autonomous and teleoperated vehicles.**

Sentinel is built around a core idea: humans shouldn't drive autonomous vehicles — but they should still be in command. The operator doesn't steer. Instead, they define the *world the vehicle must navigate*: weather zones, geofenced areas, network policies, and ad-hoc simulation commands. Each vehicle's onboard decision engine continuously evaluates these constraints against its position and state, and Sentinel makes that reasoning visible in real time.

This is **constraint-based supervision** — a fundamentally different model from remote control or passive monitoring. The operator shapes the environment; the vehicle decides how to stay safe within it.

---

## The Problem It Solves

As fleets of autonomous vehicles scale, two failure modes become dangerous:

1. **Operators lose situational awareness.** When dozens of vehicles are running, understanding *why* a specific vehicle slowed down or stopped requires digging through logs after the fact — by which time the situation has changed.

2. **Constraints are global and blunt.** Broadcasting a "heavy rain — all vehicles slow down" command treats every vehicle the same regardless of whether they're in the affected area. A vehicle 50 km away slows down for no reason; a vehicle in a flooded zone doesn't know it.

Sentinel addresses both:
- Every constraint is **visible, attributable, and traceable** — you can see which constraints are active on which vehicle and follow the causal chain from constraint → decision → behavior
- Weather events have **geographic radius** — only vehicles inside the zone are affected
- Geofence zones are **drawn on the map** — operators see exactly what they're defining before publishing
- Vehicle decisions are **explained** — not just "SAFE STOP" but *why*: which combination of constraints triggered it, with human-readable labels

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    Operator Browser                      │
│              React · Vite · Tailwind · Leaflet           │
│                                                          │
│  publish constraints ──────────────── view fleet state  │
│  draw geofences ──── observe decisions ── send commands  │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket /ws/clients
┌────────────────────────▼────────────────────────────────┐
│                   Sentinel Backend                       │
│             Node.js · TypeScript · Fastify 4             │
│                                                          │
│  REST /api/*     │  WS /ws/clients  │  WS /ws/sentinels  │
│  constraint CRUD │  frontend sync   │  vehicle channel   │
└───────────────────┬─────────────────────────────────────┘
                    │ WebSocket /ws/sentinels
   ┌────────────────┼────────────────┐
   ▼                ▼                ▼
vehicle-001     vehicle-002     vehicle-N
│
├── RouteSimulator     moves along a waypoint circuit
├── DecisionEngine     evaluates constraints vs. position
├── Reporter           reports state, reacts to commands
└── WSClient           maintains backend connection
```

**The information flows in two directions simultaneously:**

- *Operator → Fleet:* Publish a weather zone → backend stores it → pushes `CONSTRAINT_UPDATE` to all connected vehicles → each vehicle's decision engine re-evaluates → vehicle slows/stops → sends `STATUS_UPDATE` back → frontend reflects the new state
- *Fleet → Operator:* Every status change, decision change, and event is pushed to the browser in real time, feeding the map, the timeline, and the vehicle profile view

---

## The Vehicle Decision Engine

Each mock vehicle runs its own decision engine — a small policy layer that takes the active constraints and the vehicle's current position as input, and outputs a decision state and a set of reason codes.

The engine is deliberately simple and auditable. There are no black boxes.

| Decision State | Meaning |
|---|---|
| `NORMAL` | No constraints affect this vehicle at its current position |
| `DEGRADED_SPEED` | One or more low-severity constraints in effect — slow down |
| `SAFE_STOP_RECOMMENDED` | High-severity conditions detected — stop safely |
| `REROUTE_RECOMMENDED` | Vehicle is inside a FORBIDDEN geofence zone |

Reason codes explain *which* constraint caused *which* decision:

| Code | Source |
|---|---|
| `WEATHER_HEAVY_RAIN`, `WEATHER_FOG`, `WEATHER_STRONG_WIND`, `WEATHER_LOW_VISIBILITY` | Weather event |
| `IN_GEOFENCE_FORBIDDEN_ZONE`, `IN_GEOFENCE_CAUTION_ZONE`, `IN_GEOFENCE_SLOW_ZONE` | Geofence |
| `NETWORK_POOR`, `NETWORK_LOST` | Network event |
| `PERCEPTION_ALARM` | Operator-triggered simulation |
| `SENSOR_OBSTACLE_DETECTED` | Obstacle simulation command |
| `SENSOR_FAULT` | Sensor malfunction simulation |
| `MULTI_FACTOR_RISK` | Multiple independent risk factors active simultaneously |

When multiple factors are active, `MULTI_FACTOR_RISK` is appended and the highest-priority decision wins.

---

## Sentinel Cognition (The Brain View)

Clicking a vehicle in the fleet list opens its **Sentinel Profile** — a 3D visualization of what the vehicle's decision engine is currently processing.

The scene shows:
- A central glowing core representing the current decision state (color = urgency)
- A floating node for each *active constraint* affecting this vehicle — labeled with constraint type and payload summary
- Animated beams connecting each constraint to the core, representing the causal link
- An idle particle cloud when no constraints are active

This is the explainability layer. An operator can see at a glance not just *what* the vehicle decided, but *which specific constraints drove it there* — and clear any of them directly from the same panel.

---

## Direct Simulation Commands

The operator can send simulation commands to any connected mock vehicle to test how it responds to conditions that are difficult to produce with constraint publishing alone:

| Command | Effect |
|---|---|
| Perception Alarm | Trigger a custom-message perception fault → `DEGRADED_SPEED` |
| Network Degraded | Simulate poor connectivity → `DEGRADED_SPEED` + `NETWORK_POOR` |
| Network Lost | Simulate total signal loss → `SAFE_STOP_RECOMMENDED` + `NETWORK_LOST` |
| Obstacle Detected | Emergency stop → `SAFE_STOP_RECOMMENDED` + `SENSOR_OBSTACLE_DETECTED` |
| Sensor Fault | Report sensor malfunction → `DEGRADED_SPEED` + `SENSOR_FAULT` |
| Clear All | Remove all simulated conditions, vehicle reverts to constraint-only evaluation |

Simulated conditions merge with real constraints — a vehicle inside a weather zone that also receives an obstacle command will stop *and* show both reason codes.

---

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

# Terminal 3 — second mock vehicle
make mock VEHICLE_ID=vehicle-002 START_LAT=37.7849 START_LNG=-122.4094
```

Open http://localhost:5173

---

## Demo Loop

1. Vehicles appear on the San Francisco map within 2 s of connecting
2. **Constraints → Weather** — set a radius, click the map to place the zone center, set HEAVY RAIN at HIGH severity, publish
3. Vehicles inside the radius switch to `DEGRADED_SPEED` — vehicles outside are unaffected
4. **Constraints → Geofence** — draw a polygon on the map, set type to FORBIDDEN, publish
5. Vehicles entering the zone stop. The map shows the zone highlighted in red
6. Click a vehicle — the 3D brain shows the constraint nodes and their causal beams to the decision core
7. In the **Direct Commands** section, send "Obstacle Detected" — the vehicle stops immediately with `SENSOR_OBSTACLE_DETECTED` visible in the cognition view
8. Send "Clear All" — simulated conditions are removed, vehicle resumes constraint-driven behavior
9. The **Event Timeline** at the bottom logs every decision change in chronological order

---

## Make Targets

| Target | Description |
|--------|-------------|
| `make install` | Install all dependencies (backend, frontend, Python venv) |
| `make dev` | Start backend and frontend in parallel |
| `make backend` | Start backend only (`localhost:3001`) |
| `make frontend` | Start frontend only (`localhost:5173`) |
| `make mock` | Start one mock vehicle |
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

---

## Project Structure

```
sentinel/
├── Makefile
├── backend/                   # Node.js · TypeScript · Fastify 4
│   └── src/
│       ├── config.ts           # ports, WS paths
│       ├── server.ts           # Fastify + WS routing
│       ├── broadcast/          # fan-out to all frontend clients
│       ├── ws/                 # WS managers (frontend + sentinel channels)
│       └── domains/
│           ├── events/         # constraint CRUD + pub/clear lifecycle
│           ├── vehicles/       # vehicle registry, status, command routing
│           └── timeline/       # append-only event log
├── frontend/                  # React · Vite · Tailwind · React-Leaflet
│   └── src/
│       ├── api/                # typed HTTP + WS clients
│       ├── store/              # Zustand stores (vehicles, events, timeline, ui)
│       ├── hooks/              # useWebSocket — handles all server messages
│       ├── types/              # shared protocol types
│       └── components/
│           ├── layout/         # AppShell, Header
│           ├── map/            # MapCanvas, VehicleMarker, GeofenceLayer, WeatherLayer
│           ├── control/        # OperatorConsole, WeatherForm, GeofenceForm
│           ├── vehicle/        # VehicleProfile, BrainCanvas, CommandPanel
│           └── timeline/       # EventTimeline, TimelineItem
└── sentinel-mock/             # Python · asyncio · websockets
    └── sentinel/
        ├── config.py           # argparse config
        ├── main.py             # wires all components, starts async tasks
        ├── policy/             # DecisionEngine, ReasonCodes
        ├── simulation/         # RouteSimulator, VehicleState
        ├── reporting/          # Reporter — evaluates, reports, handles commands
        ├── transport/          # WSClient with reconnect + send queue
        ├── models/             # status and event message types
        └── tests/              # pytest decision engine tests
```

---

## API Reference

### REST

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/vehicles` | All registered vehicles |
| `GET` | `/api/vehicles/:id` | Single vehicle |
| `POST` | `/api/vehicles/:id/command` | Send simulation command to vehicle |
| `GET` | `/api/events` | All constraints (active + cleared) |
| `POST` | `/api/events` | Publish a new constraint |
| `DELETE` | `/api/events/:id` | Clear a constraint |

### WebSocket: server → frontend (`/ws/clients`)

| Type | Description |
|------|-------------|
| `INIT_STATE` | Full snapshot on connect (vehicles, events, timeline) |
| `VEHICLE_UPDATE` | Single vehicle state changed |
| `VEHICLE_CONNECTED` / `VEHICLE_DISCONNECTED` | Fleet membership change |
| `EVENT_PUBLISHED` | New constraint activated |
| `EVENT_CLEARED` | Constraint removed |
| `TIMELINE_ENTRY` | New log entry |

### WebSocket: mock → server (`/ws/sentinels`)

| Type | Direction | Description |
|------|-----------|-------------|
| `REGISTER` | mock → server | Vehicle joins, receives current active constraints |
| `STATUS_UPDATE` | mock → server | Periodic telemetry + decision state |
| `EVENT_REPORT` | mock → server | Vehicle reports a decision change |
| `CONSTRAINT_UPDATE` | server → mock | Active constraints pushed on change |
| `VEHICLE_COMMAND` | server → mock | Direct simulation command |
