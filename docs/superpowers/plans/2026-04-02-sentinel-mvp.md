# Sentinel MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack MVP for Sentinel — a fleet monitoring and control console for autonomous/teleoperated vehicles, with a premium map-first UI, real-time Node.js backend, and Python Sentinel mock(s).

**Architecture:** WebSocket (`ws` library) on two server paths — `/ws/clients` for frontend connections, `/ws/sentinels` for Sentinel mock connections. Fastify backend with domain-oriented modules and in-memory stores. Zustand + React-Leaflet frontend. Python asyncio Sentinel mocks with separate transport/simulation/policy/reporting layers.

**Communication choice — WebSocket everywhere:** Both backend↔frontend and backend↔Sentinel mocks use WebSocket. This gives bidirectional real-time push with minimal overhead, is simple to debug (JSON frames), and works cleanly for multiple concurrent mock vehicles.

**Tech Stack:** Node.js 20, TypeScript 5, Fastify 4, `ws` 8, Zod 3, `uuid` | React 18, Vite 5, Tailwind CSS 3, Zustand 4, React-Leaflet 4, `leaflet-draw` | Python 3.11+, `websockets` 12, `asyncio`, `dataclasses`

---

## File Map

```
sentinel/
├── Makefile
├── README.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                         # entry point
│       ├── server.ts                        # Fastify + WS server setup
│       ├── config.ts                        # env config
│       ├── ws/
│       │   ├── frontend-clients.ts          # WS manager for UI connections
│       │   └── sentinel-clients.ts          # WS manager for mock connections
│       ├── broadcast/
│       │   └── broadcaster.ts               # fan-out to all frontend clients
│       └── domains/
│           ├── events/
│           │   ├── event.model.ts           # types + Zod schemas
│           │   ├── event.store.ts           # in-memory store
│           │   ├── event.service.ts         # business logic
│           │   └── event.routes.ts          # Fastify routes
│           ├── vehicles/
│           │   ├── vehicle.model.ts
│           │   ├── vehicle.store.ts
│           │   ├── vehicle.service.ts
│           │   └── vehicle.routes.ts
│           └── timeline/
│               ├── timeline.model.ts
│               ├── timeline.store.ts
│               └── timeline.service.ts
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── types/index.ts                   # shared domain types
│       ├── api/
│       │   ├── http.ts                      # typed fetch wrapper
│       │   └── ws.ts                        # WS client + reconnect logic
│       ├── store/
│       │   ├── vehicles.store.ts
│       │   ├── events.store.ts
│       │   ├── timeline.store.ts
│       │   └── ui.store.ts                  # selected vehicle, active panel, modals
│       ├── hooks/
│       │   └── useWebSocket.ts
│       └── components/
│           ├── layout/
│           │   ├── AppShell.tsx
│           │   └── Header.tsx
│           ├── ui/
│           │   ├── StatusChip.tsx           # NORMAL / DEGRADED_SPEED / etc chips
│           │   ├── Badge.tsx
│           │   └── EmptyState.tsx
│           ├── map/
│           │   ├── MapCanvas.tsx            # full-screen Leaflet map
│           │   ├── VehicleMarker.tsx        # custom icon per vehicle
│           │   ├── GeofenceLayer.tsx        # render published geofences
│           │   └── GeofenceDrawer.tsx       # Leaflet.draw polygon tool
│           ├── control/
│           │   ├── ControlPanel.tsx         # left sidebar
│           │   ├── WeatherForm.tsx
│           │   ├── GeofenceForm.tsx
│           │   ├── NetworkForm.tsx
│           │   └── ActiveConstraints.tsx
│           ├── vehicle/
│           │   ├── VehiclePanel.tsx         # right drawer on vehicle select
│           │   ├── DecisionBadge.tsx
│           │   └── ConstraintList.tsx
│           └── timeline/
│               ├── EventTimeline.tsx        # bottom panel
│               └── TimelineItem.tsx
└── sentinel-mock/
    ├── requirements.txt
    ├── pyproject.toml
    └── sentinel/
        ├── __init__.py
        ├── main.py                          # CLI entry point
        ├── config.py                        # config dataclass + argparse
        ├── transport/
        │   ├── __init__.py
        │   └── ws_client.py                 # reconnecting WS client
        ├── simulation/
        │   ├── __init__.py
        │   ├── vehicle_state.py             # position, speed, heading
        │   └── route_simulator.py           # waypoint-based movement
        ├── policy/
        │   ├── __init__.py
        │   ├── reason_codes.py              # enum of reason codes
        │   └── decision_engine.py           # deterministic decision logic
        ├── models/
        │   ├── __init__.py
        │   ├── events.py                    # incoming constraint models
        │   └── status.py                    # outgoing status/event models
        └── reporting/
            ├── __init__.py
            └── reporter.py                  # periodic + event-driven reports
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `sentinel/backend/package.json`
- Create: `sentinel/backend/tsconfig.json`
- Create: `sentinel/frontend/package.json`
- Create: `sentinel/frontend/tsconfig.json`
- Create: `sentinel/frontend/vite.config.ts`
- Create: `sentinel/frontend/tailwind.config.ts`
- Create: `sentinel/frontend/postcss.config.js`
- Create: `sentinel/frontend/index.html`
- Create: `sentinel/sentinel-mock/requirements.txt`
- Create: `sentinel/sentinel-mock/pyproject.toml`

- [ ] **Step 1: Create backend package.json**

```json
// sentinel/backend/package.json
{
  "name": "sentinel-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^4.27.0",
    "@fastify/cors": "^9.0.1",
    "ws": "^8.17.1",
    "zod": "^3.23.8",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/ws": "^8.5.12",
    "@types/uuid": "^9.0.8",
    "@types/node": "^20.14.0",
    "tsx": "^4.15.0",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create backend tsconfig.json**

```json
// sentinel/backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create frontend package.json**

```json
// sentinel/frontend/package.json
{
  "name": "sentinel-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-leaflet": "^4.2.1",
    "leaflet": "^1.9.4",
    "@geoman-io/leaflet-geoman-free": "^2.16.0",
    "zustand": "^4.5.2",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/leaflet": "^1.9.12",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.3.1"
  }
}
```

- [ ] **Step 4: Create frontend tsconfig.json**

```json
// sentinel/frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
// sentinel/frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 6: Create tailwind.config.ts**

```typescript
// sentinel/frontend/tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          1: '#161b27',
          2: '#1e2536',
          3: '#252d40',
          border: '#2a3347',
        },
        accent: {
          blue:   '#3b82f6',
          cyan:   '#06b6d4',
          violet: '#8b5cf6',
          green:  '#10b981',
          amber:  '#f59e0b',
          red:    '#ef4444',
          orange: '#f97316',
        },
        decision: {
          normal:   '#10b981',
          degraded: '#f59e0b',
          stop:     '#ef4444',
          reroute:  '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)',
        panel: '0 4px 24px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 7: Create postcss.config.js**

```javascript
// sentinel/frontend/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 8: Create index.html**

```html
<!-- sentinel/frontend/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sentinel — Fleet Control Console</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/@geoman-io/leaflet-geoman-free@latest/dist/leaflet-geoman.css"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create sentinel-mock requirements.txt**

```text
# sentinel/sentinel-mock/requirements.txt
websockets==12.0
```

- [ ] **Step 10: Create sentinel-mock pyproject.toml**

```toml
# sentinel/sentinel-mock/pyproject.toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.backends.legacy:build"

[project]
name = "sentinel-mock"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = ["websockets==12.0"]

[project.scripts]
sentinel-mock = "sentinel.main:main"

[tool.setuptools.packages.find]
where = ["."]
include = ["sentinel*"]
```

- [ ] **Step 11: Install backend dependencies**

```bash
cd sentinel/backend && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 12: Install frontend dependencies**

```bash
cd sentinel/frontend && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 13: Commit scaffolding**

```bash
cd sentinel
git init
git add .
git commit -m "chore: scaffold sentinel project structure"
```

---

## Task 2: Shared Protocol Types

**Files:**
- Create: `sentinel/backend/src/domains/events/event.model.ts`
- Create: `sentinel/backend/src/domains/vehicles/vehicle.model.ts`
- Create: `sentinel/backend/src/domains/timeline/timeline.model.ts`
- Create: `sentinel/frontend/src/types/index.ts`
- Create: `sentinel/sentinel-mock/sentinel/models/events.py`
- Create: `sentinel/sentinel-mock/sentinel/models/status.py`
- Create: `sentinel/sentinel-mock/sentinel/models/__init__.py`

These files define the shared message contract between all three services.

- [ ] **Step 1: Write backend event model**

```typescript
// sentinel/backend/src/domains/events/event.model.ts
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

export const WeatherSeverity = z.enum(['LOW', 'MODERATE', 'HIGH', 'EXTREME'])
export const NetworkSeverity = z.enum(['DEGRADED', 'UNSTABLE', 'LOST'])
export const GeofenceType = z.enum(['FORBIDDEN', 'CAUTION', 'SLOW'])
export const EventType = z.enum(['WEATHER', 'GEOFENCE', 'NETWORK'])

export const LatLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

export const WeatherPayloadSchema = z.object({
  condition: z.enum(['HEAVY_RAIN', 'FOG', 'STRONG_WIND', 'LOW_VISIBILITY', 'SNOW', 'ICE']),
  severity: WeatherSeverity,
  durationMinutes: z.number().int().positive().optional(),
  description: z.string().optional(),
})

export const GeofencePayloadSchema = z.object({
  type: GeofenceType,
  polygon: z.array(LatLngSchema).min(3),
  label: z.string().optional(),
  validUntil: z.string().datetime().optional(),
})

export const NetworkPayloadSchema = z.object({
  severity: NetworkSeverity,
  vehicleId: z.string().optional(), // undefined = global
  description: z.string().optional(),
})

export const CreateEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('WEATHER'), payload: WeatherPayloadSchema }),
  z.object({ type: z.literal('GEOFENCE'), payload: GeofencePayloadSchema }),
  z.object({ type: z.literal('NETWORK'), payload: NetworkPayloadSchema }),
])

export type CreateEventDto = z.infer<typeof CreateEventSchema>
export type LatLng = z.infer<typeof LatLngSchema>
export type WeatherPayload = z.infer<typeof WeatherPayloadSchema>
export type GeofencePayload = z.infer<typeof GeofencePayloadSchema>
export type NetworkPayload = z.infer<typeof NetworkPayloadSchema>

export interface ActiveEvent {
  id: string
  type: 'WEATHER' | 'GEOFENCE' | 'NETWORK'
  payload: WeatherPayload | GeofencePayload | NetworkPayload
  createdAt: string
  clearedAt?: string
  active: boolean
}

export function createActiveEvent(dto: CreateEventDto): ActiveEvent {
  return {
    id: uuidv4(),
    type: dto.type,
    payload: dto.payload,
    createdAt: new Date().toISOString(),
    active: true,
  }
}
```

- [ ] **Step 2: Write backend vehicle model**

```typescript
// sentinel/backend/src/domains/vehicles/vehicle.model.ts

export type DecisionState =
  | 'NORMAL'
  | 'DEGRADED_SPEED'
  | 'SAFE_STOP_RECOMMENDED'
  | 'REROUTE_RECOMMENDED'

export type ReasonCode =
  | 'WEATHER_HEAVY_RAIN'
  | 'WEATHER_LOW_VISIBILITY'
  | 'WEATHER_STRONG_WIND'
  | 'WEATHER_FOG'
  | 'GEOFENCE_AHEAD'
  | 'IN_GEOFENCE_FORBIDDEN_ZONE'
  | 'IN_GEOFENCE_SLOW_ZONE'
  | 'IN_GEOFENCE_CAUTION_ZONE'
  | 'NETWORK_POOR'
  | 'NETWORK_LOST'
  | 'MULTI_FACTOR_RISK'

export interface VehiclePosition {
  lat: number
  lng: number
  heading: number // degrees 0-360
}

export interface VehicleStatus {
  vehicleId: string
  position: VehiclePosition
  speedKmh: number
  decision: DecisionState
  reasonCodes: ReasonCode[]
  activeConstraintIds: string[]
  lastSeenAt: string
  connected: boolean
}

// Message sent from Sentinel mock → backend
export interface SentinelStatusMessage {
  type: 'REGISTER' | 'STATUS_UPDATE' | 'EVENT_REPORT'
  vehicleId: string
  payload: SentinelRegisterPayload | SentinelStatusPayload | SentinelEventPayload
}

export interface SentinelRegisterPayload {
  vehicleId: string
  position: VehiclePosition
}

export interface SentinelStatusPayload {
  position: VehiclePosition
  speedKmh: number
  decision: DecisionState
  reasonCodes: ReasonCode[]
  activeConstraintIds: string[]
}

export interface SentinelEventPayload {
  event: string
  previousDecision: DecisionState
  newDecision: DecisionState
  reasonCodes: ReasonCode[]
  description: string
}
```

- [ ] **Step 3: Write backend timeline model**

```typescript
// sentinel/backend/src/domains/timeline/timeline.model.ts
import { v4 as uuidv4 } from 'uuid'
import type { DecisionState, ReasonCode } from '../vehicles/vehicle.model.js'

export type TimelineCategory =
  | 'OPERATOR_ACTION'
  | 'BACKEND_EVENT'
  | 'SENTINEL_RECEIPT'
  | 'SENTINEL_DECISION'
  | 'SENTINEL_REPORT'

export interface TimelineEntry {
  id: string
  timestamp: string
  category: TimelineCategory
  vehicleId?: string
  eventId?: string
  title: string
  detail: string
  decision?: DecisionState
  reasonCodes?: ReasonCode[]
}

export function makeTimelineEntry(
  fields: Omit<TimelineEntry, 'id' | 'timestamp'>
): TimelineEntry {
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...fields,
  }
}
```

- [ ] **Step 4: Write frontend shared types**

```typescript
// sentinel/frontend/src/types/index.ts

// ─── Decisions ───────────────────────────────────────────────────────────────
export type DecisionState =
  | 'NORMAL'
  | 'DEGRADED_SPEED'
  | 'SAFE_STOP_RECOMMENDED'
  | 'REROUTE_RECOMMENDED'

export type ReasonCode =
  | 'WEATHER_HEAVY_RAIN'
  | 'WEATHER_LOW_VISIBILITY'
  | 'WEATHER_STRONG_WIND'
  | 'WEATHER_FOG'
  | 'GEOFENCE_AHEAD'
  | 'IN_GEOFENCE_FORBIDDEN_ZONE'
  | 'IN_GEOFENCE_SLOW_ZONE'
  | 'IN_GEOFENCE_CAUTION_ZONE'
  | 'NETWORK_POOR'
  | 'NETWORK_LOST'
  | 'MULTI_FACTOR_RISK'

// ─── Vehicles ────────────────────────────────────────────────────────────────
export interface VehiclePosition {
  lat: number
  lng: number
  heading: number
}

export interface VehicleStatus {
  vehicleId: string
  position: VehiclePosition
  speedKmh: number
  decision: DecisionState
  reasonCodes: ReasonCode[]
  activeConstraintIds: string[]
  lastSeenAt: string
  connected: boolean
}

// ─── Events ──────────────────────────────────────────────────────────────────
export type EventType = 'WEATHER' | 'GEOFENCE' | 'NETWORK'
export type WeatherCondition =
  | 'HEAVY_RAIN' | 'FOG' | 'STRONG_WIND' | 'LOW_VISIBILITY' | 'SNOW' | 'ICE'
export type WeatherSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME'
export type NetworkSeverity = 'DEGRADED' | 'UNSTABLE' | 'LOST'
export type GeofenceType = 'FORBIDDEN' | 'CAUTION' | 'SLOW'

export interface LatLng { lat: number; lng: number }

export interface WeatherPayload {
  condition: WeatherCondition
  severity: WeatherSeverity
  durationMinutes?: number
  description?: string
}

export interface GeofencePayload {
  type: GeofenceType
  polygon: LatLng[]
  label?: string
  validUntil?: string
}

export interface NetworkPayload {
  severity: NetworkSeverity
  vehicleId?: string
  description?: string
}

export interface ActiveEvent {
  id: string
  type: EventType
  payload: WeatherPayload | GeofencePayload | NetworkPayload
  createdAt: string
  clearedAt?: string
  active: boolean
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
export type TimelineCategory =
  | 'OPERATOR_ACTION'
  | 'BACKEND_EVENT'
  | 'SENTINEL_RECEIPT'
  | 'SENTINEL_DECISION'
  | 'SENTINEL_REPORT'

export interface TimelineEntry {
  id: string
  timestamp: string
  category: TimelineCategory
  vehicleId?: string
  eventId?: string
  title: string
  detail: string
  decision?: DecisionState
  reasonCodes?: ReasonCode[]
}

// ─── WebSocket messages (backend → frontend) ──────────────────────────────────
export type ServerMessage =
  | { type: 'INIT_STATE'; vehicles: VehicleStatus[]; events: ActiveEvent[]; timeline: TimelineEntry[] }
  | { type: 'VEHICLE_UPDATE'; vehicle: VehicleStatus }
  | { type: 'EVENT_PUBLISHED'; event: ActiveEvent }
  | { type: 'EVENT_CLEARED'; eventId: string; clearedAt: string }
  | { type: 'TIMELINE_ENTRY'; entry: TimelineEntry }
  | { type: 'VEHICLE_CONNECTED'; vehicleId: string }
  | { type: 'VEHICLE_DISCONNECTED'; vehicleId: string }
```

- [ ] **Step 5: Write Python event models**

```python
# sentinel/sentinel-mock/sentinel/models/events.py
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal, Optional


@dataclass
class LatLng:
    lat: float
    lng: float


@dataclass
class WeatherPayload:
    condition: Literal['HEAVY_RAIN', 'FOG', 'STRONG_WIND', 'LOW_VISIBILITY', 'SNOW', 'ICE']
    severity: Literal['LOW', 'MODERATE', 'HIGH', 'EXTREME']
    durationMinutes: Optional[int] = None
    description: Optional[str] = None


@dataclass
class GeofencePayload:
    type: Literal['FORBIDDEN', 'CAUTION', 'SLOW']
    polygon: list[LatLng] = field(default_factory=list)
    label: Optional[str] = None
    validUntil: Optional[str] = None


@dataclass
class NetworkPayload:
    severity: Literal['DEGRADED', 'UNSTABLE', 'LOST']
    vehicleId: Optional[str] = None
    description: Optional[str] = None


@dataclass
class ActiveConstraint:
    id: str
    type: Literal['WEATHER', 'GEOFENCE', 'NETWORK']
    payload: WeatherPayload | GeofencePayload | NetworkPayload
    createdAt: str
    active: bool = True


def parse_constraint(data: dict) -> ActiveConstraint:
    """Parse a raw constraint dict from the backend into a typed ActiveConstraint."""
    t = data['type']
    p = data['payload']
    if t == 'WEATHER':
        payload: WeatherPayload | GeofencePayload | NetworkPayload = WeatherPayload(
            condition=p['condition'],
            severity=p['severity'],
            durationMinutes=p.get('durationMinutes'),
            description=p.get('description'),
        )
    elif t == 'GEOFENCE':
        polygon = [LatLng(lat=c['lat'], lng=c['lng']) for c in p.get('polygon', [])]
        payload = GeofencePayload(
            type=p['type'],
            polygon=polygon,
            label=p.get('label'),
            validUntil=p.get('validUntil'),
        )
    else:  # NETWORK
        payload = NetworkPayload(
            severity=p['severity'],
            vehicleId=p.get('vehicleId'),
            description=p.get('description'),
        )
    return ActiveConstraint(
        id=data['id'],
        type=t,  # type: ignore[arg-type]
        payload=payload,
        createdAt=data['createdAt'],
        active=data.get('active', True),
    )
```

- [ ] **Step 6: Write Python status models**

```python
# sentinel/sentinel-mock/sentinel/models/status.py
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal

DecisionState = Literal[
    'NORMAL',
    'DEGRADED_SPEED',
    'SAFE_STOP_RECOMMENDED',
    'REROUTE_RECOMMENDED',
]

ReasonCode = Literal[
    'WEATHER_HEAVY_RAIN',
    'WEATHER_LOW_VISIBILITY',
    'WEATHER_STRONG_WIND',
    'WEATHER_FOG',
    'GEOFENCE_AHEAD',
    'IN_GEOFENCE_FORBIDDEN_ZONE',
    'IN_GEOFENCE_SLOW_ZONE',
    'IN_GEOFENCE_CAUTION_ZONE',
    'NETWORK_POOR',
    'NETWORK_LOST',
    'MULTI_FACTOR_RISK',
]


@dataclass
class VehiclePosition:
    lat: float
    lng: float
    heading: float  # 0-360 degrees


@dataclass
class VehicleStatusPayload:
    position: VehiclePosition
    speedKmh: float
    decision: DecisionState
    reasonCodes: list[str] = field(default_factory=list)
    activeConstraintIds: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            'position': {
                'lat': self.position.lat,
                'lng': self.position.lng,
                'heading': self.position.heading,
            },
            'speedKmh': self.speedKmh,
            'decision': self.decision,
            'reasonCodes': self.reasonCodes,
            'activeConstraintIds': self.activeConstraintIds,
        }


@dataclass
class SentinelMessage:
    type: Literal['REGISTER', 'STATUS_UPDATE', 'EVENT_REPORT']
    vehicleId: str
    payload: dict

    def to_dict(self) -> dict:
        return {
            'type': self.type,
            'vehicleId': self.vehicleId,
            'payload': self.payload,
        }
```

- [ ] **Step 7: Create Python model __init__.py**

```python
# sentinel/sentinel-mock/sentinel/models/__init__.py
from .events import ActiveConstraint, LatLng, WeatherPayload, GeofencePayload, NetworkPayload, parse_constraint
from .status import VehiclePosition, VehicleStatusPayload, SentinelMessage, DecisionState, ReasonCode

__all__ = [
    'ActiveConstraint', 'LatLng', 'WeatherPayload', 'GeofencePayload', 'NetworkPayload', 'parse_constraint',
    'VehiclePosition', 'VehicleStatusPayload', 'SentinelMessage', 'DecisionState', 'ReasonCode',
]
```

- [ ] **Step 8: Commit types**

```bash
cd sentinel
git add .
git commit -m "feat: add shared protocol types for all three services"
```

---

## Task 3: Backend — Config, Server, and Entry Point

**Files:**
- Create: `sentinel/backend/src/config.ts`
- Create: `sentinel/backend/src/server.ts`
- Create: `sentinel/backend/src/index.ts`

- [ ] **Step 1: Write config.ts**

```typescript
// sentinel/backend/src/config.ts
export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  host: process.env.HOST ?? '0.0.0.0',
  clientWsPath: '/ws/clients',
  sentinelWsPath: '/ws/sentinels',
} as const
```

- [ ] **Step 2: Write server.ts**

```typescript
// sentinel/backend/src/server.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { IncomingMessage, Server as HttpServer, ServerResponse } from 'http'
import { WebSocketServer } from 'ws'
import { config } from './config.js'
import { FrontendClientManager } from './ws/frontend-clients.js'
import { SentinelClientManager } from './ws/sentinel-clients.js'
import { Broadcaster } from './broadcast/broadcaster.js'
import { registerEventRoutes } from './domains/events/event.routes.js'
import { registerVehicleRoutes } from './domains/vehicles/vehicle.routes.js'

export async function buildServer() {
  const app = Fastify({ logger: { level: 'info' } })

  await app.register(cors, { origin: true })

  // ── HTTP routes ────────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok' }))
  registerEventRoutes(app)
  registerVehicleRoutes(app)

  // ── WebSocket servers (attached after HTTP server is ready) ────────────────
  const httpServer: HttpServer<typeof IncomingMessage, typeof ServerResponse> =
    app.server

  const clientWss = new WebSocketServer({ noServer: true })
  const sentinelWss = new WebSocketServer({ noServer: true })

  const broadcaster = new Broadcaster(clientWss)
  const frontendMgr = new FrontendClientManager(clientWss, broadcaster)
  const sentinelMgr = new SentinelClientManager(sentinelWss, broadcaster)

  // Route upgrade requests to the appropriate WS server by path
  httpServer.on('upgrade', (req, socket, head) => {
    const url = req.url ?? ''
    if (url.startsWith(config.clientWsPath)) {
      clientWss.handleUpgrade(req, socket, head, (ws) => {
        clientWss.emit('connection', ws, req)
      })
    } else if (url.startsWith(config.sentinelWsPath)) {
      sentinelWss.handleUpgrade(req, socket, head, (ws) => {
        sentinelWss.emit('connection', ws, req)
      })
    } else {
      socket.destroy()
    }
  })

  return { app, broadcaster, frontendMgr, sentinelMgr }
}
```

- [ ] **Step 3: Write index.ts**

```typescript
// sentinel/backend/src/index.ts
import { buildServer } from './server.js'
import { config } from './config.js'

async function main() {
  const { app } = await buildServer()
  await app.listen({ port: config.port, host: config.host })
  console.log(`Sentinel Manager running on port ${config.port}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 4: Verify TypeScript compiles (partial — stubs needed)**

At this point we need the WS managers and broadcast stub to exist. Create empty stubs:

```typescript
// sentinel/backend/src/broadcast/broadcaster.ts
import type { WebSocketServer } from 'ws'

export class Broadcaster {
  constructor(private wss: WebSocketServer) {}
  broadcast(_msg: object) {}
  broadcastTo(_vehicleId: string, _msg: object) {}
}
```

```typescript
// sentinel/backend/src/ws/frontend-clients.ts
import type { WebSocketServer } from 'ws'
import type { Broadcaster } from '../broadcast/broadcaster.js'

export class FrontendClientManager {
  constructor(_wss: WebSocketServer, _broadcaster: Broadcaster) {}
}
```

```typescript
// sentinel/backend/src/ws/sentinel-clients.ts
import type { WebSocketServer } from 'ws'
import type { Broadcaster } from '../broadcast/broadcaster.js'

export class SentinelClientManager {
  constructor(_wss: WebSocketServer, _broadcaster: Broadcaster) {}
}
```

- [ ] **Step 5: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: backend server skeleton with Fastify and WS routing"
```

---

## Task 4: Backend — In-Memory Stores

**Files:**
- Create: `sentinel/backend/src/domains/events/event.store.ts`
- Create: `sentinel/backend/src/domains/vehicles/vehicle.store.ts`
- Create: `sentinel/backend/src/domains/timeline/timeline.store.ts`

- [ ] **Step 1: Write event store**

```typescript
// sentinel/backend/src/domains/events/event.store.ts
import type { ActiveEvent } from './event.model.js'

class EventStore {
  private events = new Map<string, ActiveEvent>()

  add(event: ActiveEvent): void {
    this.events.set(event.id, event)
  }

  get(id: string): ActiveEvent | undefined {
    return this.events.get(id)
  }

  getAll(): ActiveEvent[] {
    return Array.from(this.events.values())
  }

  getActive(): ActiveEvent[] {
    return this.getAll().filter((e) => e.active)
  }

  clear(id: string, clearedAt: string): ActiveEvent | undefined {
    const event = this.events.get(id)
    if (!event) return undefined
    const updated = { ...event, active: false, clearedAt }
    this.events.set(id, updated)
    return updated
  }
}

export const eventStore = new EventStore()
```

- [ ] **Step 2: Write vehicle store**

```typescript
// sentinel/backend/src/domains/vehicles/vehicle.store.ts
import type { VehicleStatus } from './vehicle.model.js'

class VehicleStore {
  private vehicles = new Map<string, VehicleStatus>()

  upsert(status: VehicleStatus): void {
    this.vehicles.set(status.vehicleId, status)
  }

  get(vehicleId: string): VehicleStatus | undefined {
    return this.vehicles.get(vehicleId)
  }

  getAll(): VehicleStatus[] {
    return Array.from(this.vehicles.values())
  }

  setConnected(vehicleId: string, connected: boolean): void {
    const v = this.vehicles.get(vehicleId)
    if (v) this.vehicles.set(vehicleId, { ...v, connected })
  }
}

export const vehicleStore = new VehicleStore()
```

- [ ] **Step 3: Write timeline store**

```typescript
// sentinel/backend/src/domains/timeline/timeline.store.ts
import type { TimelineEntry } from './timeline.model.js'

const MAX_ENTRIES = 500

class TimelineStore {
  private entries: TimelineEntry[] = []

  add(entry: TimelineEntry): void {
    this.entries.unshift(entry)          // newest first
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(0, MAX_ENTRIES)
    }
  }

  getAll(): TimelineEntry[] {
    return [...this.entries]
  }

  getRecent(n: number): TimelineEntry[] {
    return this.entries.slice(0, n)
  }
}

export const timelineStore = new TimelineStore()
```

- [ ] **Step 4: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: add in-memory stores for events, vehicles, and timeline"
```

---

## Task 5: Backend — Event and Vehicle Services

**Files:**
- Create: `sentinel/backend/src/domains/events/event.service.ts`
- Create: `sentinel/backend/src/domains/vehicles/vehicle.service.ts`
- Create: `sentinel/backend/src/domains/timeline/timeline.service.ts`

- [ ] **Step 1: Write test for event service**

```typescript
// sentinel/backend/src/domains/events/event.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { EventService } from './event.service.js'
import { eventStore } from './event.store.js'
import { timelineStore } from '../timeline/timeline.store.js'

describe('EventService', () => {
  let svc: EventService

  beforeEach(() => {
    // Reset stores by reinitializing
    svc = new EventService(eventStore, timelineStore, { broadcast: () => {} } as any)
  })

  it('creates a weather event and returns it', () => {
    const event = svc.publish({
      type: 'WEATHER',
      payload: { condition: 'HEAVY_RAIN', severity: 'HIGH' },
    })
    expect(event.type).toBe('WEATHER')
    expect(event.active).toBe(true)
    expect(event.id).toBeTruthy()
  })

  it('clears an active event by id', () => {
    const event = svc.publish({
      type: 'WEATHER',
      payload: { condition: 'FOG', severity: 'MODERATE' },
    })
    const cleared = svc.clear(event.id)
    expect(cleared?.active).toBe(false)
    expect(cleared?.clearedAt).toBeTruthy()
  })

  it('returns undefined when clearing unknown event', () => {
    const result = svc.clear('nonexistent-id')
    expect(result).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd sentinel/backend && npm test -- --reporter=verbose
```

Expected: FAIL — `EventService` not found.

- [ ] **Step 3: Write event service**

```typescript
// sentinel/backend/src/domains/events/event.service.ts
import type { CreateEventDto, ActiveEvent } from './event.model.js'
import { createActiveEvent } from './event.model.js'
import type { EventStore } from './event.store.js'
import type { TimelineStore } from '../timeline/timeline.store.js'
import { makeTimelineEntry } from '../timeline/timeline.model.js'
import type { Broadcaster } from '../../broadcast/broadcaster.js'

export class EventService {
  constructor(
    private eventStore: EventStore,
    private timelineStore: TimelineStore,
    private broadcaster: Broadcaster,
  ) {}

  publish(dto: CreateEventDto): ActiveEvent {
    const event = createActiveEvent(dto)
    this.eventStore.add(event)

    this.timelineStore.add(
      makeTimelineEntry({
        category: 'OPERATOR_ACTION',
        eventId: event.id,
        title: `${event.type} event published`,
        detail: this.describeEvent(event),
      })
    )

    this.broadcaster.broadcast({ type: 'EVENT_PUBLISHED', event })
    this.broadcaster.broadcast({
      type: 'TIMELINE_ENTRY',
      entry: this.timelineStore.getRecent(1)[0],
    })

    return event
  }

  clear(id: string): ActiveEvent | undefined {
    const clearedAt = new Date().toISOString()
    const event = this.eventStore.clear(id, clearedAt)
    if (!event) return undefined

    this.timelineStore.add(
      makeTimelineEntry({
        category: 'OPERATOR_ACTION',
        eventId: id,
        title: `${event.type} event cleared`,
        detail: `Operator cleared event ${id}`,
      })
    )

    this.broadcaster.broadcast({ type: 'EVENT_CLEARED', eventId: id, clearedAt })
    this.broadcaster.broadcast({
      type: 'TIMELINE_ENTRY',
      entry: this.timelineStore.getRecent(1)[0],
    })

    return event
  }

  getAll(): ActiveEvent[] {
    return this.eventStore.getAll()
  }

  getActive(): ActiveEvent[] {
    return this.eventStore.getActive()
  }

  private describeEvent(event: ActiveEvent): string {
    if (event.type === 'WEATHER') {
      const p = event.payload as import('./event.model.js').WeatherPayload
      return `${p.condition} — severity ${p.severity}`
    }
    if (event.type === 'GEOFENCE') {
      const p = event.payload as import('./event.model.js').GeofencePayload
      return `${p.type} zone${p.label ? ` "${p.label}"` : ''}`
    }
    const p = event.payload as import('./event.model.js').NetworkPayload
    return `Network ${p.severity}${p.vehicleId ? ` for ${p.vehicleId}` : ' (global)'}`
  }
}
```

Note: The store types need to be exported for EventService's constructor. Update `event.store.ts` and `timeline.store.ts` to export the class type:

```typescript
// Add to event.store.ts after the class definition:
export type { EventStore }
// (The class itself is already exported as `eventStore` singleton; EventService takes the class instance)
```

Actually, simplify: make EventService take the singleton directly. Update service constructor to use the singleton stores. Also add `export type EventStore` by exporting the class:

Update `event.store.ts`:
```typescript
// sentinel/backend/src/domains/events/event.store.ts
import type { ActiveEvent } from './event.model.js'

export class EventStore {    // <-- export the class
  private events = new Map<string, ActiveEvent>()
  // ... rest same as before
  add(event: ActiveEvent): void { this.events.set(event.id, event) }
  get(id: string): ActiveEvent | undefined { return this.events.get(id) }
  getAll(): ActiveEvent[] { return Array.from(this.events.values()) }
  getActive(): ActiveEvent[] { return this.getAll().filter((e) => e.active) }
  clear(id: string, clearedAt: string): ActiveEvent | undefined {
    const event = this.events.get(id)
    if (!event) return undefined
    const updated = { ...event, active: false, clearedAt }
    this.events.set(id, updated)
    return updated
  }
}
export const eventStore = new EventStore()
```

Update `vehicle.store.ts`:
```typescript
// sentinel/backend/src/domains/vehicles/vehicle.store.ts
import type { VehicleStatus } from './vehicle.model.js'

export class VehicleStore {   // <-- export class
  private vehicles = new Map<string, VehicleStatus>()
  upsert(status: VehicleStatus): void { this.vehicles.set(status.vehicleId, status) }
  get(vehicleId: string): VehicleStatus | undefined { return this.vehicles.get(vehicleId) }
  getAll(): VehicleStatus[] { return Array.from(this.vehicles.values()) }
  setConnected(vehicleId: string, connected: boolean): void {
    const v = this.vehicles.get(vehicleId)
    if (v) this.vehicles.set(vehicleId, { ...v, connected })
  }
}
export const vehicleStore = new VehicleStore()
```

Update `timeline.store.ts`:
```typescript
// sentinel/backend/src/domains/timeline/timeline.store.ts
import type { TimelineEntry } from './timeline.model.js'

const MAX_ENTRIES = 500

export class TimelineStore {   // <-- export class
  private entries: TimelineEntry[] = []
  add(entry: TimelineEntry): void {
    this.entries.unshift(entry)
    if (this.entries.length > MAX_ENTRIES) this.entries = this.entries.slice(0, MAX_ENTRIES)
  }
  getAll(): TimelineEntry[] { return [...this.entries] }
  getRecent(n: number): TimelineEntry[] { return this.entries.slice(0, n) }
}
export const timelineStore = new TimelineStore()
```

- [ ] **Step 4: Write vehicle service**

```typescript
// sentinel/backend/src/domains/vehicles/vehicle.service.ts
import type {
  VehicleStatus,
  SentinelStatusPayload,
  SentinelEventPayload,
} from './vehicle.model.js'
import type { VehicleStore } from './vehicle.store.js'
import type { TimelineStore } from '../timeline/timeline.store.js'
import { makeTimelineEntry } from '../timeline/timeline.model.js'
import type { Broadcaster } from '../../broadcast/broadcaster.js'
import { vehicleStore } from './vehicle.store.js'
import { timelineStore } from '../timeline/timeline.store.js'

export class VehicleService {
  constructor(
    private vehicleStore: VehicleStore,
    private timelineStore: TimelineStore,
    private broadcaster: Broadcaster,
  ) {}

  register(vehicleId: string, position: VehicleStatus['position']): VehicleStatus {
    const existing = this.vehicleStore.get(vehicleId)
    const status: VehicleStatus = existing
      ? { ...existing, connected: true, lastSeenAt: new Date().toISOString() }
      : {
          vehicleId,
          position,
          speedKmh: 0,
          decision: 'NORMAL',
          reasonCodes: [],
          activeConstraintIds: [],
          lastSeenAt: new Date().toISOString(),
          connected: true,
        }
    this.vehicleStore.upsert(status)

    const entry = makeTimelineEntry({
      category: 'SENTINEL_RECEIPT',
      vehicleId,
      title: `${vehicleId} connected`,
      detail: `Sentinel mock registered at (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})`,
    })
    this.timelineStore.add(entry)
    this.broadcaster.broadcast({ type: 'VEHICLE_CONNECTED', vehicleId })
    this.broadcaster.broadcast({ type: 'TIMELINE_ENTRY', entry })
    this.broadcaster.broadcast({ type: 'VEHICLE_UPDATE', vehicle: status })

    return status
  }

  handleStatusUpdate(vehicleId: string, payload: SentinelStatusPayload): void {
    const existing = this.vehicleStore.get(vehicleId)
    if (!existing) return

    const prevDecision = existing.decision
    const status: VehicleStatus = {
      ...existing,
      ...payload,
      vehicleId,
      connected: true,
      lastSeenAt: new Date().toISOString(),
    }
    this.vehicleStore.upsert(status)
    this.broadcaster.broadcast({ type: 'VEHICLE_UPDATE', vehicle: status })

    if (prevDecision !== payload.decision) {
      const entry = makeTimelineEntry({
        category: 'SENTINEL_DECISION',
        vehicleId,
        title: `${vehicleId} decision changed`,
        detail: `${prevDecision} → ${payload.decision}`,
        decision: payload.decision,
        reasonCodes: payload.reasonCodes,
      })
      this.timelineStore.add(entry)
      this.broadcaster.broadcast({ type: 'TIMELINE_ENTRY', entry })
    }
  }

  handleEventReport(vehicleId: string, payload: SentinelEventPayload): void {
    const entry = makeTimelineEntry({
      category: 'SENTINEL_REPORT',
      vehicleId,
      title: `${vehicleId}: ${payload.event}`,
      detail: payload.description,
      decision: payload.newDecision,
      reasonCodes: payload.reasonCodes,
    })
    this.timelineStore.add(entry)
    this.broadcaster.broadcast({ type: 'TIMELINE_ENTRY', entry })
  }

  disconnect(vehicleId: string): void {
    this.vehicleStore.setConnected(vehicleId, false)
    const v = this.vehicleStore.get(vehicleId)
    if (v) this.broadcaster.broadcast({ type: 'VEHICLE_UPDATE', vehicle: { ...v, connected: false } })
    const entry = makeTimelineEntry({
      category: 'SENTINEL_REPORT',
      vehicleId,
      title: `${vehicleId} disconnected`,
      detail: `Sentinel mock lost connection`,
    })
    this.timelineStore.add(entry)
    this.broadcaster.broadcast({ type: 'VEHICLE_DISCONNECTED', vehicleId })
    this.broadcaster.broadcast({ type: 'TIMELINE_ENTRY', entry })
  }

  getAll(): VehicleStatus[] {
    return this.vehicleStore.getAll()
  }
}

// Singleton — created lazily after broadcaster is available
let _instance: VehicleService | null = null
export function getVehicleService(broadcaster: Broadcaster): VehicleService {
  if (!_instance) _instance = new VehicleService(vehicleStore, timelineStore, broadcaster)
  return _instance
}
```

- [ ] **Step 5: Write timeline service**

```typescript
// sentinel/backend/src/domains/timeline/timeline.service.ts
import { timelineStore } from './timeline.store.js'

export function getRecentTimeline(n = 100) {
  return timelineStore.getRecent(n)
}

export function getAllTimeline() {
  return timelineStore.getAll()
}
```

- [ ] **Step 6: Run tests**

```bash
cd sentinel/backend && npm test -- --reporter=verbose
```

Expected: EventService tests PASS.

- [ ] **Step 7: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: add event and vehicle services with timeline integration"
```

---

## Task 6: Backend — HTTP Routes

**Files:**
- Create: `sentinel/backend/src/domains/events/event.routes.ts`
- Create: `sentinel/backend/src/domains/vehicles/vehicle.routes.ts`

These routes also need access to the broadcaster singleton. We'll use a module-level singleton pattern with a `setBroadcaster` init function.

- [ ] **Step 1: Write event routes**

```typescript
// sentinel/backend/src/domains/events/event.routes.ts
import type { FastifyInstance } from 'fastify'
import { CreateEventSchema } from './event.model.js'
import { EventService } from './event.service.js'
import { eventStore } from './event.store.js'
import { timelineStore } from '../timeline/timeline.store.js'
import type { Broadcaster } from '../../broadcast/broadcaster.js'

let eventService: EventService

export function initEventService(broadcaster: Broadcaster) {
  eventService = new EventService(eventStore, timelineStore, broadcaster)
}

export function getEventService(): EventService {
  return eventService
}

export function registerEventRoutes(app: FastifyInstance) {
  app.get('/api/events', async () => {
    return eventService.getAll()
  })

  app.post('/api/events', async (req, reply) => {
    const parsed = CreateEventSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }
    const event = eventService.publish(parsed.data)
    return reply.status(201).send(event)
  })

  app.delete('/api/events/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const cleared = eventService.clear(id)
    if (!cleared) return reply.status(404).send({ error: 'Event not found' })
    return cleared
  })
}
```

- [ ] **Step 2: Write vehicle routes**

```typescript
// sentinel/backend/src/domains/vehicles/vehicle.routes.ts
import type { FastifyInstance } from 'fastify'
import type { VehicleService } from './vehicle.service.js'

let vehicleService: VehicleService

export function initVehicleService(svc: VehicleService) {
  vehicleService = svc
}

export function registerVehicleRoutes(app: FastifyInstance) {
  app.get('/api/vehicles', async () => {
    return vehicleService.getAll()
  })

  app.get('/api/vehicles/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const all = vehicleService.getAll()
    const vehicle = all.find((v) => v.vehicleId === id)
    if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found' })
    return vehicle
  })
}
```

- [ ] **Step 3: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: add HTTP routes for events and vehicles"
```

---

## Task 7: Backend — Broadcaster and WebSocket Managers

**Files:**
- Overwrite: `sentinel/backend/src/broadcast/broadcaster.ts`
- Overwrite: `sentinel/backend/src/ws/frontend-clients.ts`
- Overwrite: `sentinel/backend/src/ws/sentinel-clients.ts`

- [ ] **Step 1: Write real Broadcaster**

```typescript
// sentinel/backend/src/broadcast/broadcaster.ts
import { WebSocket, WebSocketServer } from 'ws'

export class Broadcaster {
  constructor(private wss: WebSocketServer) {}

  broadcast(msg: object): void {
    const json = JSON.stringify(msg)
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json)
      }
    })
  }

  // For targeted messages (e.g. vehicle-specific events sent back only to that sentinel)
  broadcastTo(ws: WebSocket, msg: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  sendInitState(
    ws: WebSocket,
    vehicles: object[],
    events: object[],
    timeline: object[]
  ): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'INIT_STATE', vehicles, events, timeline }))
    }
  }
}
```

- [ ] **Step 2: Write FrontendClientManager**

```typescript
// sentinel/backend/src/ws/frontend-clients.ts
import { WebSocket, WebSocketServer } from 'ws'
import type { Broadcaster } from '../broadcast/broadcaster.js'
import { eventStore } from '../domains/events/event.store.js'
import { vehicleStore } from '../domains/vehicles/vehicle.store.js'
import { timelineStore } from '../domains/timeline/timeline.store.js'

export class FrontendClientManager {
  constructor(wss: WebSocketServer, broadcaster: Broadcaster) {
    wss.on('connection', (ws: WebSocket) => {
      // Send full state snapshot on connect
      broadcaster.sendInitState(
        ws,
        vehicleStore.getAll(),
        eventStore.getAll(),
        timelineStore.getRecent(100)
      )

      ws.on('error', (err) => console.error('Frontend WS error:', err))
      ws.on('close', () => {})
      // Frontend sends no messages in MVP (all actions go through HTTP API)
    })
  }
}
```

- [ ] **Step 3: Write SentinelClientManager**

```typescript
// sentinel/backend/src/ws/sentinel-clients.ts
import { WebSocket, WebSocketServer } from 'ws'
import type { Broadcaster } from '../broadcast/broadcaster.js'
import { getVehicleService } from '../domains/vehicles/vehicle.service.js'
import { eventStore } from '../domains/events/event.store.js'
import type {
  SentinelStatusMessage,
  SentinelRegisterPayload,
  SentinelStatusPayload,
  SentinelEventPayload,
} from '../domains/vehicles/vehicle.model.js'

export class SentinelClientManager {
  private sentinels = new Map<string, WebSocket>()

  constructor(wss: WebSocketServer, private broadcaster: Broadcaster) {
    wss.on('connection', (ws: WebSocket) => {
      let vehicleId: string | null = null

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString()) as SentinelStatusMessage

          if (msg.type === 'REGISTER') {
            vehicleId = msg.vehicleId
            this.sentinels.set(vehicleId, ws)
            const svc = getVehicleService(broadcaster)
            const payload = msg.payload as SentinelRegisterPayload
            svc.register(vehicleId, payload.position)

            // Send current active constraints to newly connected sentinel
            const activeEvents = eventStore.getActive()
            ws.send(JSON.stringify({
              type: 'CONSTRAINT_UPDATE',
              constraints: activeEvents,
            }))

            // Record timeline entry for constraint receipt
            if (activeEvents.length > 0) {
              import('../domains/timeline/timeline.store.js').then(({ timelineStore }) => {
                import('../domains/timeline/timeline.model.js').then(({ makeTimelineEntry }) => {
                  const entry = makeTimelineEntry({
                    category: 'SENTINEL_RECEIPT',
                    vehicleId: msg.vehicleId,
                    title: `${msg.vehicleId} received ${activeEvents.length} active constraint(s)`,
                    detail: `Delivered on connect`,
                  })
                  timelineStore.add(entry)
                  broadcaster.broadcast({ type: 'TIMELINE_ENTRY', entry })
                })
              })
            }
          } else if (msg.type === 'STATUS_UPDATE') {
            getVehicleService(broadcaster).handleStatusUpdate(
              msg.vehicleId,
              msg.payload as SentinelStatusPayload
            )
          } else if (msg.type === 'EVENT_REPORT') {
            getVehicleService(broadcaster).handleEventReport(
              msg.vehicleId,
              msg.payload as SentinelEventPayload
            )
          }
        } catch (err) {
          console.error('Error parsing sentinel message:', err)
        }
      })

      ws.on('close', () => {
        if (vehicleId) {
          this.sentinels.delete(vehicleId)
          getVehicleService(broadcaster).disconnect(vehicleId)
        }
      })

      ws.on('error', (err) => console.error('Sentinel WS error:', err))
    })
  }

  /** Push updated constraints to all or a specific sentinel */
  pushConstraints(constraints: object[], targetVehicleId?: string) {
    const msg = JSON.stringify({ type: 'CONSTRAINT_UPDATE', constraints })
    if (targetVehicleId) {
      const ws = this.sentinels.get(targetVehicleId)
      if (ws?.readyState === WebSocket.OPEN) ws.send(msg)
    } else {
      this.sentinels.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg)
      })
    }
  }

  getSentinelIds(): string[] {
    return Array.from(this.sentinels.keys())
  }
}
```

- [ ] **Step 4: Wire everything in server.ts — update to call inits**

Replace `server.ts` with the wired version:

```typescript
// sentinel/backend/src/server.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { IncomingMessage, Server as HttpServer, ServerResponse } from 'http'
import { WebSocketServer } from 'ws'
import { config } from './config.js'
import { FrontendClientManager } from './ws/frontend-clients.js'
import { SentinelClientManager } from './ws/sentinel-clients.js'
import { Broadcaster } from './broadcast/broadcaster.js'
import { registerEventRoutes, initEventService } from './domains/events/event.routes.js'
import { registerVehicleRoutes, initVehicleService } from './domains/vehicles/vehicle.routes.js'
import { getVehicleService } from './domains/vehicles/vehicle.service.js'

export async function buildServer() {
  const app = Fastify({ logger: { level: 'info' } })
  await app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok' }))

  // Build WS servers and broadcaster first (services depend on broadcaster)
  const httpServer: HttpServer<typeof IncomingMessage, typeof ServerResponse> = app.server
  const clientWss = new WebSocketServer({ noServer: true })
  const sentinelWss = new WebSocketServer({ noServer: true })
  const broadcaster = new Broadcaster(clientWss)

  // Init services with broadcaster
  initEventService(broadcaster)
  const vehicleService = getVehicleService(broadcaster)
  initVehicleService(vehicleService)

  // Register routes
  registerEventRoutes(app)
  registerVehicleRoutes(app)

  // Wire WS path routing
  httpServer.on('upgrade', (req, socket, head) => {
    const url = req.url ?? ''
    if (url.startsWith(config.clientWsPath)) {
      clientWss.handleUpgrade(req, socket, head, (ws) => clientWss.emit('connection', ws, req))
    } else if (url.startsWith(config.sentinelWsPath)) {
      sentinelWss.handleUpgrade(req, socket, head, (ws) => sentinelWss.emit('connection', ws, req))
    } else {
      socket.destroy()
    }
  })

  const frontendMgr = new FrontendClientManager(clientWss, broadcaster)
  const sentinelMgr = new SentinelClientManager(sentinelWss, broadcaster)

  // When an event is published/cleared, push updated constraints to all sentinels
  const origPublish = (app as any)._eventPublishHook
  void origPublish // unused — we hook via event service instead

  return { app, broadcaster, frontendMgr, sentinelMgr }
}
```

Also update `event.service.ts` to push constraints to sentinels. Since SentinelClientManager is created after EventService, use a late-bind pattern. Add a `setSentinelManager` method:

```typescript
// Add to event.service.ts — update publish() and clear() to call sentinelMgr:
// The SentinelClientManager will be injected after construction.

// At top of event.service.ts add:
import type { SentinelClientManager } from '../../ws/sentinel-clients.js'

// In EventService class add:
  private sentinelMgr?: SentinelClientManager

  setSentinelManager(mgr: SentinelClientManager) {
    this.sentinelMgr = mgr
  }

// In publish(), after broadcaster.broadcast call:
    const activeConstraints = this.eventStore.getActive()
    this.sentinelMgr?.pushConstraints(activeConstraints)

// In clear(), after broadcaster.broadcast call:
    const activeConstraints = this.eventStore.getActive()
    this.sentinelMgr?.pushConstraints(activeConstraints)
```

Then in `server.ts`, after creating `sentinelMgr`, call:
```typescript
  getEventService().setSentinelManager(sentinelMgr)
```

- [ ] **Step 5: Run backend**

```bash
cd sentinel/backend && npm run dev
```

Expected: Server starts, logs `Sentinel Manager running on port 3001`.

- [ ] **Step 6: Smoke test with curl**

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok"}

curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"WEATHER","payload":{"condition":"HEAVY_RAIN","severity":"HIGH"}}'
# Expected: 201 with event JSON
```

- [ ] **Step 7: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: complete backend with WS managers and constraint push-down"
```

---

## Task 8: Sentinel Mock — Config, Transport, and Models

**Files:**
- Create: `sentinel/sentinel-mock/sentinel/__init__.py`
- Create: `sentinel/sentinel-mock/sentinel/config.py`
- Create: `sentinel/sentinel-mock/sentinel/transport/__init__.py`
- Create: `sentinel/sentinel-mock/sentinel/transport/ws_client.py`
- Create: `sentinel/sentinel-mock/sentinel/policy/__init__.py`
- Create: `sentinel/sentinel-mock/sentinel/policy/reason_codes.py`
- Create: `sentinel/sentinel-mock/sentinel/simulation/__init__.py`
- Create: `sentinel/sentinel-mock/sentinel/reporting/__init__.py`

- [ ] **Step 1: Create top-level __init__.py**

```python
# sentinel/sentinel-mock/sentinel/__init__.py
```

- [ ] **Step 2: Write config.py**

```python
# sentinel/sentinel-mock/sentinel/config.py
from __future__ import annotations
import argparse
from dataclasses import dataclass


@dataclass
class SentinelConfig:
    vehicle_id: str
    backend_url: str
    status_interval: float  # seconds between periodic status reports
    start_lat: float
    start_lng: float


def parse_config() -> SentinelConfig:
    parser = argparse.ArgumentParser(description='Sentinel Mock Vehicle')
    parser.add_argument('--vehicle-id', required=True, help='Unique vehicle ID')
    parser.add_argument(
        '--backend-url',
        default='ws://localhost:3001/ws/sentinels',
        help='Backend WebSocket URL',
    )
    parser.add_argument(
        '--status-interval',
        type=float,
        default=3.0,
        help='Seconds between status reports',
    )
    parser.add_argument('--lat', type=float, default=37.7749, help='Start latitude')
    parser.add_argument('--lng', type=float, default=-122.4194, help='Start longitude')
    args = parser.parse_args()
    return SentinelConfig(
        vehicle_id=args.vehicle_id,
        backend_url=args.backend_url,
        status_interval=args.status_interval,
        start_lat=args.lat,
        start_lng=args.lng,
    )
```

- [ ] **Step 3: Write reason_codes.py**

```python
# sentinel/sentinel-mock/sentinel/policy/reason_codes.py
from enum import Enum


class ReasonCode(str, Enum):
    WEATHER_HEAVY_RAIN = 'WEATHER_HEAVY_RAIN'
    WEATHER_LOW_VISIBILITY = 'WEATHER_LOW_VISIBILITY'
    WEATHER_STRONG_WIND = 'WEATHER_STRONG_WIND'
    WEATHER_FOG = 'WEATHER_FOG'
    GEOFENCE_AHEAD = 'GEOFENCE_AHEAD'
    IN_GEOFENCE_FORBIDDEN_ZONE = 'IN_GEOFENCE_FORBIDDEN_ZONE'
    IN_GEOFENCE_SLOW_ZONE = 'IN_GEOFENCE_SLOW_ZONE'
    IN_GEOFENCE_CAUTION_ZONE = 'IN_GEOFENCE_CAUTION_ZONE'
    NETWORK_POOR = 'NETWORK_POOR'
    NETWORK_LOST = 'NETWORK_LOST'
    MULTI_FACTOR_RISK = 'MULTI_FACTOR_RISK'
```

- [ ] **Step 4: Create stub __init__.py files**

```python
# sentinel/sentinel-mock/sentinel/transport/__init__.py
# sentinel/sentinel-mock/sentinel/policy/__init__.py
# sentinel/sentinel-mock/sentinel/simulation/__init__.py
# sentinel/sentinel-mock/sentinel/reporting/__init__.py
```
(Create all four as empty files.)

- [ ] **Step 5: Write WebSocket transport client**

```python
# sentinel/sentinel-mock/sentinel/transport/ws_client.py
from __future__ import annotations
import asyncio
import json
import logging
from typing import Callable, Awaitable
import websockets
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger(__name__)

MessageHandler = Callable[[dict], Awaitable[None]]


class WSClient:
    """Reconnecting WebSocket client for Sentinel mock → backend communication."""

    RECONNECT_DELAY = 3.0  # seconds

    def __init__(self, url: str, on_message: MessageHandler):
        self._url = url
        self._on_message = on_message
        self._ws: websockets.WebSocketClientProtocol | None = None
        self._running = False
        self._send_queue: asyncio.Queue[str] = asyncio.Queue()

    async def start(self) -> None:
        self._running = True
        while self._running:
            try:
                logger.info(f'Connecting to {self._url}')
                async with websockets.connect(self._url) as ws:
                    self._ws = ws
                    logger.info(f'Connected to {self._url}')
                    await asyncio.gather(
                        self._recv_loop(ws),
                        self._send_loop(ws),
                    )
            except ConnectionClosed:
                logger.warning('Connection closed, reconnecting...')
            except OSError as e:
                logger.warning(f'Connection failed: {e}, retrying in {self.RECONNECT_DELAY}s')
            except Exception as e:
                logger.error(f'Unexpected error: {e}')
            finally:
                self._ws = None
            if self._running:
                await asyncio.sleep(self.RECONNECT_DELAY)

    async def _recv_loop(self, ws: websockets.WebSocketClientProtocol) -> None:
        async for raw in ws:
            try:
                msg = json.loads(raw)
                await self._on_message(msg)
            except json.JSONDecodeError:
                logger.error(f'Invalid JSON from backend: {raw}')
            except Exception as e:
                logger.error(f'Error handling message: {e}')

    async def _send_loop(self, ws: websockets.WebSocketClientProtocol) -> None:
        while True:
            msg = await self._send_queue.get()
            try:
                await ws.send(msg)
            except ConnectionClosed:
                # Put message back and break — reconnect will retry
                await self._send_queue.put(msg)
                break

    async def send(self, data: dict) -> None:
        await self._send_queue.put(json.dumps(data))

    async def stop(self) -> None:
        self._running = False
        if self._ws:
            await self._ws.close()
```

- [ ] **Step 6: Commit mock foundation**

```bash
cd sentinel
git add .
git commit -m "feat: sentinel mock config, transport, and reason codes"
```

---

## Task 9: Sentinel Mock — Vehicle Simulation

**Files:**
- Create: `sentinel/sentinel-mock/sentinel/simulation/vehicle_state.py`
- Create: `sentinel/sentinel-mock/sentinel/simulation/route_simulator.py`

- [ ] **Step 1: Write vehicle_state.py**

```python
# sentinel/sentinel-mock/sentinel/simulation/vehicle_state.py
from __future__ import annotations
import math
import time
from dataclasses import dataclass, field
from sentinel.models.status import VehiclePosition


@dataclass
class VehicleState:
    vehicle_id: str
    position: VehiclePosition
    speed_kmh: float = 30.0
    normal_speed_kmh: float = 30.0
    degraded_speed_kmh: float = 10.0
    heading: float = 0.0  # degrees 0-360
    last_update: float = field(default_factory=time.monotonic)

    def update_position(self, delta_seconds: float) -> None:
        """Move vehicle along heading at current speed."""
        dist_m = (self.speed_kmh / 3.6) * delta_seconds
        # Earth radius in meters
        R = 6_371_000.0
        lat_rad = math.radians(self.position.lat)
        heading_rad = math.radians(self.heading)

        delta_lat = (dist_m * math.cos(heading_rad)) / R
        delta_lng = (dist_m * math.sin(heading_rad)) / (R * math.cos(lat_rad))

        self.position = VehiclePosition(
            lat=self.position.lat + math.degrees(delta_lat),
            lng=self.position.lng + math.degrees(delta_lng),
            heading=self.heading,
        )
        self.last_update = time.monotonic()
```

- [ ] **Step 2: Write route_simulator.py**

```python
# sentinel/sentinel-mock/sentinel/simulation/route_simulator.py
from __future__ import annotations
import math
import time
import asyncio
import logging
from sentinel.simulation.vehicle_state import VehicleState
from sentinel.models.status import VehiclePosition

logger = logging.getLogger(__name__)

# Simple circular waypoint route
def _build_default_route(start_lat: float, start_lng: float) -> list[VehiclePosition]:
    """Build a simple 8-waypoint loop around the starting position."""
    waypoints = []
    radius_deg = 0.01  # ~1km radius
    for i in range(8):
        angle = math.radians(i * 45)
        waypoints.append(VehiclePosition(
            lat=start_lat + radius_deg * math.sin(angle),
            lng=start_lng + radius_deg * math.cos(angle),
            heading=(i * 45 + 90) % 360,
        ))
    return waypoints


def _bearing(p1: VehiclePosition, p2: VehiclePosition) -> float:
    """Calculate bearing from p1 to p2 in degrees."""
    lat1, lon1 = math.radians(p1.lat), math.radians(p1.lng)
    lat2, lon2 = math.radians(p2.lat), math.radians(p2.lng)
    dlon = lon2 - lon1
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def _distance_m(p1: VehiclePosition, p2: VehiclePosition) -> float:
    """Haversine distance in meters."""
    R = 6_371_000.0
    lat1, lat2 = math.radians(p1.lat), math.radians(p2.lat)
    dlat = lat2 - lat1
    dlng = math.radians(p2.lng - p1.lng)
    a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))


class RouteSimulator:
    WAYPOINT_ARRIVAL_THRESHOLD_M = 30.0
    UPDATE_INTERVAL = 0.5  # seconds

    def __init__(self, state: VehicleState):
        self.state = state
        self._route = _build_default_route(state.position.lat, state.position.lng)
        self._waypoint_idx = 0
        self._running = False

    async def run(self) -> None:
        self._running = True
        last_time = time.monotonic()
        while self._running:
            await asyncio.sleep(self.UPDATE_INTERVAL)
            now = time.monotonic()
            delta = now - last_time
            last_time = now

            target = self._route[self._waypoint_idx]
            dist = _distance_m(self.state.position, target)

            if dist < self.WAYPOINT_ARRIVAL_THRESHOLD_M:
                self._waypoint_idx = (self._waypoint_idx + 1) % len(self._route)
                target = self._route[self._waypoint_idx]

            bearing = _bearing(self.state.position, target)
            self.state.heading = bearing
            self.state.position = VehiclePosition(
                lat=self.state.position.lat,
                lng=self.state.position.lng,
                heading=bearing,
            )
            self.state.update_position(delta)

    def stop(self) -> None:
        self._running = False
```

- [ ] **Step 3: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: sentinel mock vehicle state and route simulation"
```

---

## Task 10: Sentinel Mock — Policy Engine

**Files:**
- Create: `sentinel/sentinel-mock/sentinel/policy/decision_engine.py`

- [ ] **Step 1: Write test for decision engine**

```python
# sentinel/sentinel-mock/tests/test_decision_engine.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sentinel.policy.decision_engine import DecisionEngine
from sentinel.models.events import (
    ActiveConstraint, WeatherPayload, GeofencePayload, NetworkPayload, LatLng
)
from datetime import datetime, timezone

def _ts():
    return datetime.now(timezone.utc).isoformat()

def make_weather(condition, severity) -> ActiveConstraint:
    return ActiveConstraint(
        id='w1', type='WEATHER',
        payload=WeatherPayload(condition=condition, severity=severity),
        createdAt=_ts(),
    )

def make_geofence(geo_type, polygon) -> ActiveConstraint:
    return ActiveConstraint(
        id='g1', type='GEOFENCE',
        payload=GeofencePayload(type=geo_type, polygon=polygon),
        createdAt=_ts(),
    )

def make_network(severity, vehicle_id=None) -> ActiveConstraint:
    return ActiveConstraint(
        id='n1', type='NETWORK',
        payload=NetworkPayload(severity=severity, vehicleId=vehicle_id),
        createdAt=_ts(),
    )

def test_normal_when_no_constraints():
    engine = DecisionEngine(vehicle_id='v1')
    decision, codes = engine.evaluate([], lat=37.7749, lng=-122.4194)
    assert decision == 'NORMAL'
    assert codes == []

def test_heavy_rain_high_causes_safe_stop():
    engine = DecisionEngine(vehicle_id='v1')
    decision, codes = engine.evaluate(
        [make_weather('HEAVY_RAIN', 'HIGH')], lat=37.7, lng=-122.4
    )
    assert decision == 'SAFE_STOP_RECOMMENDED'
    assert 'WEATHER_HEAVY_RAIN' in codes

def test_heavy_rain_low_causes_degraded_speed():
    engine = DecisionEngine(vehicle_id='v1')
    decision, codes = engine.evaluate(
        [make_weather('HEAVY_RAIN', 'LOW')], lat=37.7, lng=-122.4
    )
    assert decision == 'DEGRADED_SPEED'
    assert 'WEATHER_HEAVY_RAIN' in codes

def test_fog_moderate_causes_degraded_speed():
    engine = DecisionEngine(vehicle_id='v1')
    decision, codes = engine.evaluate(
        [make_weather('FOG', 'MODERATE')], lat=37.7, lng=-122.4
    )
    assert decision == 'DEGRADED_SPEED'
    assert 'WEATHER_FOG' in codes

def test_network_lost_causes_safe_stop():
    engine = DecisionEngine(vehicle_id='v1')
    decision, codes = engine.evaluate(
        [make_network('LOST')], lat=37.7, lng=-122.4
    )
    assert decision == 'SAFE_STOP_RECOMMENDED'
    assert 'NETWORK_LOST' in codes

def test_network_lost_vehicle_specific_applies():
    engine = DecisionEngine(vehicle_id='v1')
    decision, codes = engine.evaluate(
        [make_network('LOST', vehicle_id='v1')], lat=37.7, lng=-122.4
    )
    assert decision == 'SAFE_STOP_RECOMMENDED'

def test_network_lost_other_vehicle_ignored():
    engine = DecisionEngine(vehicle_id='v1')
    decision, codes = engine.evaluate(
        [make_network('LOST', vehicle_id='v2')], lat=37.7, lng=-122.4
    )
    assert decision == 'NORMAL'

def test_inside_forbidden_geofence_causes_safe_stop():
    # Triangle containing 37.7749, -122.4194
    poly = [
        LatLng(lat=37.77, lng=-122.43),
        LatLng(lat=37.78, lng=-122.43),
        LatLng(lat=37.78, lng=-122.41),
    ]
    engine = DecisionEngine(vehicle_id='v1')
    decision, codes = engine.evaluate(
        [make_geofence('FORBIDDEN', poly)], lat=37.775, lng=-122.425
    )
    assert decision == 'SAFE_STOP_RECOMMENDED'
    assert 'IN_GEOFENCE_FORBIDDEN_ZONE' in codes

def test_outside_geofence_is_normal():
    poly = [
        LatLng(lat=40.0, lng=-74.0),
        LatLng(lat=40.1, lng=-74.0),
        LatLng(lat=40.1, lng=-73.9),
    ]
    engine = DecisionEngine(vehicle_id='v1')
    decision, codes = engine.evaluate(
        [make_geofence('FORBIDDEN', poly)], lat=37.7749, lng=-122.4194
    )
    assert decision == 'NORMAL'
    assert codes == []

def test_multi_factor_risk_code_when_multiple_issues():
    engine = DecisionEngine(vehicle_id='v1')
    decision, codes = engine.evaluate(
        [make_weather('FOG', 'MODERATE'), make_network('DEGRADED')],
        lat=37.7, lng=-122.4
    )
    assert 'MULTI_FACTOR_RISK' in codes
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd sentinel/sentinel-mock
python -m pytest tests/test_decision_engine.py -v 2>&1 | head -30
```

Expected: ImportError — `DecisionEngine` not found.

- [ ] **Step 3: Write decision_engine.py**

```python
# sentinel/sentinel-mock/sentinel/policy/decision_engine.py
from __future__ import annotations
from sentinel.models.events import ActiveConstraint, WeatherPayload, GeofencePayload, NetworkPayload, LatLng
from sentinel.policy.reason_codes import ReasonCode

DecisionState = str  # 'NORMAL' | 'DEGRADED_SPEED' | 'SAFE_STOP_RECOMMENDED' | 'REROUTE_RECOMMENDED'

_DECISION_PRIORITY = {
    'SAFE_STOP_RECOMMENDED': 3,
    'REROUTE_RECOMMENDED': 2,
    'DEGRADED_SPEED': 1,
    'NORMAL': 0,
}


def _point_in_polygon(lat: float, lng: float, polygon: list[LatLng]) -> bool:
    """Ray-casting algorithm for point-in-polygon test."""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i].lng, polygon[i].lat
        xj, yj = polygon[j].lng, polygon[j].lat
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _evaluate_weather(
    payload: WeatherPayload,
) -> tuple[DecisionState, list[str]]:
    condition = payload.condition
    severity = payload.severity

    reason_map = {
        'HEAVY_RAIN': ReasonCode.WEATHER_HEAVY_RAIN,
        'FOG': ReasonCode.WEATHER_FOG,
        'STRONG_WIND': ReasonCode.WEATHER_STRONG_WIND,
        'LOW_VISIBILITY': ReasonCode.WEATHER_LOW_VISIBILITY,
        'SNOW': ReasonCode.WEATHER_HEAVY_RAIN,  # treat like heavy rain
        'ICE': ReasonCode.WEATHER_LOW_VISIBILITY,
    }
    code = reason_map.get(condition, ReasonCode.WEATHER_HEAVY_RAIN).value

    if severity in ('HIGH', 'EXTREME'):
        return 'SAFE_STOP_RECOMMENDED', [code]
    if severity == 'MODERATE':
        return 'DEGRADED_SPEED', [code]
    # LOW
    return 'DEGRADED_SPEED', [code]


def _evaluate_geofence(
    payload: GeofencePayload, lat: float, lng: float
) -> tuple[DecisionState, list[str]]:
    inside = _point_in_polygon(lat, lng, payload.polygon)
    if not inside:
        return 'NORMAL', []

    if payload.type == 'FORBIDDEN':
        return 'SAFE_STOP_RECOMMENDED', [ReasonCode.IN_GEOFENCE_FORBIDDEN_ZONE.value]
    if payload.type == 'SLOW':
        return 'DEGRADED_SPEED', [ReasonCode.IN_GEOFENCE_SLOW_ZONE.value]
    if payload.type == 'CAUTION':
        return 'DEGRADED_SPEED', [ReasonCode.IN_GEOFENCE_CAUTION_ZONE.value]
    return 'NORMAL', []


def _evaluate_network(
    payload: NetworkPayload, vehicle_id: str
) -> tuple[DecisionState, list[str]]:
    # Skip if targeted at a different vehicle
    if payload.vehicleId and payload.vehicleId != vehicle_id:
        return 'NORMAL', []

    if payload.severity == 'LOST':
        return 'SAFE_STOP_RECOMMENDED', [ReasonCode.NETWORK_LOST.value]
    if payload.severity in ('DEGRADED', 'UNSTABLE'):
        return 'DEGRADED_SPEED', [ReasonCode.NETWORK_POOR.value]
    return 'NORMAL', []


class DecisionEngine:
    def __init__(self, vehicle_id: str):
        self.vehicle_id = vehicle_id

    def evaluate(
        self,
        constraints: list[ActiveConstraint],
        lat: float,
        lng: float,
    ) -> tuple[DecisionState, list[str]]:
        """
        Evaluate all active constraints and return the worst decision and reason codes.
        Returns (decision_state, reason_codes).
        """
        overall_decision: DecisionState = 'NORMAL'
        all_codes: list[str] = []

        for constraint in constraints:
            if not constraint.active:
                continue

            if constraint.type == 'WEATHER':
                decision, codes = _evaluate_weather(constraint.payload)  # type: ignore[arg-type]
            elif constraint.type == 'GEOFENCE':
                decision, codes = _evaluate_geofence(constraint.payload, lat, lng)  # type: ignore[arg-type]
            elif constraint.type == 'NETWORK':
                decision, codes = _evaluate_network(constraint.payload, self.vehicle_id)  # type: ignore[arg-type]
            else:
                continue

            if _DECISION_PRIORITY.get(decision, 0) > _DECISION_PRIORITY.get(overall_decision, 0):
                overall_decision = decision
            all_codes.extend(codes)

        # Deduplicate codes
        unique_codes = list(dict.fromkeys(all_codes))

        # Add MULTI_FACTOR_RISK if multiple distinct factors
        if len([c for c in unique_codes if not c.startswith('MULTI')]) > 1:
            unique_codes.append(ReasonCode.MULTI_FACTOR_RISK.value)

        return overall_decision, unique_codes
```

- [ ] **Step 4: Run tests**

```bash
cd sentinel/sentinel-mock
python -m pytest tests/test_decision_engine.py -v
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: sentinel policy decision engine with full test coverage"
```

---

## Task 11: Sentinel Mock — Reporter and Main

**Files:**
- Create: `sentinel/sentinel-mock/sentinel/reporting/reporter.py`
- Create: `sentinel/sentinel-mock/sentinel/main.py`

- [ ] **Step 1: Write reporter.py**

```python
# sentinel/sentinel-mock/sentinel/reporting/reporter.py
from __future__ import annotations
import asyncio
import logging
from sentinel.models.status import VehicleStatusPayload, SentinelMessage, VehiclePosition
from sentinel.simulation.vehicle_state import VehicleState
from sentinel.policy.decision_engine import DecisionEngine
from sentinel.models.events import ActiveConstraint, parse_constraint
from sentinel.transport.ws_client import WSClient

logger = logging.getLogger(__name__)


class Reporter:
    def __init__(
        self,
        vehicle_id: str,
        state: VehicleState,
        engine: DecisionEngine,
        client: WSClient,
        status_interval: float,
    ):
        self.vehicle_id = vehicle_id
        self.state = state
        self.engine = engine
        self.client = client
        self.status_interval = status_interval
        self._constraints: list[ActiveConstraint] = []
        self._last_decision = 'NORMAL'
        self._last_codes: list[str] = []

    async def register(self) -> None:
        msg = SentinelMessage(
            type='REGISTER',
            vehicleId=self.vehicle_id,
            payload={
                'vehicleId': self.vehicle_id,
                'position': {
                    'lat': self.state.position.lat,
                    'lng': self.state.position.lng,
                    'heading': self.state.position.heading,
                },
            },
        )
        await self.client.send(msg.to_dict())
        logger.info(f'Registered {self.vehicle_id} with backend')

    async def handle_backend_message(self, msg: dict) -> None:
        msg_type = msg.get('type')

        if msg_type == 'CONSTRAINT_UPDATE':
            raw_constraints = msg.get('constraints', [])
            self._constraints = [parse_constraint(c) for c in raw_constraints]
            logger.info(f'{self.vehicle_id}: received {len(self._constraints)} constraint(s)')
            # Immediately re-evaluate and report if decision changed
            await self._evaluate_and_report(force=True)

        elif msg_type == 'CONSTRAINT_CLEARED':
            cleared_id = msg.get('eventId')
            self._constraints = [c for c in self._constraints if c.id != cleared_id]
            await self._evaluate_and_report(force=True)

    async def _evaluate_and_report(self, force: bool = False) -> None:
        decision, codes = self.engine.evaluate(
            self._constraints,
            lat=self.state.position.lat,
            lng=self.state.position.lng,
        )

        decision_changed = (decision != self._last_decision)

        if decision_changed:
            # Report the decision change as an event
            event_msg = SentinelMessage(
                type='EVENT_REPORT',
                vehicleId=self.vehicle_id,
                payload={
                    'event': 'DECISION_CHANGED',
                    'previousDecision': self._last_decision,
                    'newDecision': decision,
                    'reasonCodes': codes,
                    'description': (
                        f'Decision changed from {self._last_decision} to {decision}. '
                        f'Reasons: {", ".join(codes) if codes else "none"}'
                    ),
                },
            )
            await self.client.send(event_msg.to_dict())
            logger.info(
                f'{self.vehicle_id}: decision {self._last_decision} → {decision} '
                f'({", ".join(codes)})'
            )

        self._last_decision = decision
        self._last_codes = codes

        # Always send status update on forced re-evaluation
        if force or decision_changed:
            await self._send_status(decision, codes)

    async def _send_status(self, decision: str, codes: list[str]) -> None:
        payload = VehicleStatusPayload(
            position=VehiclePosition(
                lat=self.state.position.lat,
                lng=self.state.position.lng,
                heading=self.state.position.heading,
            ),
            speedKmh=self.state.speed_kmh if decision == 'NORMAL' else (
                self.state.degraded_speed_kmh if decision == 'DEGRADED_SPEED' else 0.0
            ),
            decision=decision,  # type: ignore[arg-type]
            reasonCodes=codes,
            activeConstraintIds=[c.id for c in self._constraints if c.active],
        )
        msg = SentinelMessage(
            type='STATUS_UPDATE',
            vehicleId=self.vehicle_id,
            payload=payload.to_dict(),
        )
        await self.client.send(msg.to_dict())

    async def run_periodic_reporting(self) -> None:
        """Send periodic status reports to the backend."""
        while True:
            await asyncio.sleep(self.status_interval)
            decision, codes = self.engine.evaluate(
                self._constraints,
                lat=self.state.position.lat,
                lng=self.state.position.lng,
            )
            self._last_decision = decision
            self._last_codes = codes
            await self._send_status(decision, codes)
```

- [ ] **Step 2: Write main.py**

```python
# sentinel/sentinel-mock/sentinel/main.py
from __future__ import annotations
import asyncio
import logging
from sentinel.config import parse_config
from sentinel.transport.ws_client import WSClient
from sentinel.simulation.vehicle_state import VehicleState
from sentinel.simulation.route_simulator import RouteSimulator
from sentinel.policy.decision_engine import DecisionEngine
from sentinel.reporting.reporter import Reporter
from sentinel.models.status import VehiclePosition

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)


async def run(config) -> None:
    state = VehicleState(
        vehicle_id=config.vehicle_id,
        position=VehiclePosition(
            lat=config.start_lat,
            lng=config.start_lng,
            heading=0.0,
        ),
    )

    engine = DecisionEngine(vehicle_id=config.vehicle_id)
    simulator = RouteSimulator(state)

    async def on_message(msg: dict) -> None:
        await reporter.handle_backend_message(msg)

    client = WSClient(url=config.backend_url, on_message=on_message)

    reporter = Reporter(
        vehicle_id=config.vehicle_id,
        state=state,
        engine=engine,
        client=client,
        status_interval=config.status_interval,
    )

    # Start all tasks concurrently
    connect_task = asyncio.create_task(client.start())

    # Wait for connection before registering (brief delay)
    await asyncio.sleep(1.0)
    await reporter.register()

    await asyncio.gather(
        connect_task,
        simulator.run(),
        reporter.run_periodic_reporting(),
    )


def main() -> None:
    config = parse_config()
    logger.info(f'Starting Sentinel mock: {config.vehicle_id}')
    try:
        asyncio.run(run(config))
    except KeyboardInterrupt:
        logger.info('Sentinel mock stopped')


if __name__ == '__main__':
    main()
```

- [ ] **Step 3: Set up Python venv and test-run the mock**

```bash
cd sentinel/sentinel-mock
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Test it starts (backend must be running)
python -m sentinel.main --vehicle-id vehicle-001 --help
```

Expected: Help text printed, no import errors.

- [ ] **Step 4: Run mock tests**

```bash
cd sentinel/sentinel-mock
python -m pytest tests/ -v
```

Expected: All decision engine tests PASS.

- [ ] **Step 5: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: sentinel mock reporter, main entry point, and venv setup"
```

---

## Task 12: Frontend — Main Entry, App Shell, and Design System

**Files:**
- Create: `sentinel/frontend/src/main.tsx`
- Create: `sentinel/frontend/src/App.tsx`
- Create: `sentinel/frontend/src/components/layout/AppShell.tsx`
- Create: `sentinel/frontend/src/components/layout/Header.tsx`
- Create: `sentinel/frontend/src/components/ui/StatusChip.tsx`
- Create: `sentinel/frontend/src/components/ui/Badge.tsx`
- Create: `sentinel/frontend/src/components/ui/EmptyState.tsx`

- [ ] **Step 1: Write main.tsx**

```tsx
// sentinel/frontend/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 2: Create index.css with Tailwind directives and base styles**

```css
/* sentinel/frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; margin: 0; padding: 0; }
  body {
    background-color: #0f1117;
    color: #e2e8f0;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  /* Leaflet map z-index fix */
  .leaflet-container { font-family: inherit; }
  .leaflet-pane { z-index: 1; }
  .leaflet-top, .leaflet-bottom { z-index: 2; }
}

@layer utilities {
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: #2a3347 transparent;
  }
  .scrollbar-thin::-webkit-scrollbar { width: 4px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: #2a3347; border-radius: 2px; }
}
```

- [ ] **Step 3: Write App.tsx**

```tsx
// sentinel/frontend/src/App.tsx
import { useEffect } from 'react'
import AppShell from './components/layout/AppShell'
import { useWebSocket } from './hooks/useWebSocket'

export default function App() {
  const connect = useWebSocket()

  useEffect(() => {
    connect()
  }, [connect])

  return <AppShell />
}
```

- [ ] **Step 4: Write AppShell.tsx**

```tsx
// sentinel/frontend/src/components/layout/AppShell.tsx
import { useState } from 'react'
import Header from './Header'
import MapCanvas from '../map/MapCanvas'
import ControlPanel from '../control/ControlPanel'
import VehiclePanel from '../vehicle/VehiclePanel'
import EventTimeline from '../timeline/EventTimeline'
import { useUIStore } from '../../store/ui.store'

export default function AppShell() {
  const { selectedVehicleId, timelineOpen, setTimelineOpen } = useUIStore()

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Control Panel */}
        <div className="w-72 shrink-0 flex flex-col bg-surface-1 border-r border-surface-border overflow-y-auto scrollbar-thin z-10">
          <ControlPanel />
        </div>

        {/* Center: Map */}
        <div className="flex-1 relative overflow-hidden">
          <MapCanvas />

          {/* Timeline toggle button */}
          <button
            onClick={() => setTimelineOpen(!timelineOpen)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20
              flex items-center gap-2 px-4 py-2 rounded-full
              bg-surface-2 border border-surface-border
              text-xs font-medium text-slate-300 hover:text-white
              hover:bg-surface-3 transition-all shadow-panel"
          >
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
            {timelineOpen ? 'Hide' : 'Show'} Event Timeline
          </button>
        </div>

        {/* Right: Vehicle Panel (shown when vehicle selected) */}
        {selectedVehicleId && (
          <div className="w-80 shrink-0 flex flex-col bg-surface-1 border-l border-surface-border overflow-y-auto scrollbar-thin z-10">
            <VehiclePanel vehicleId={selectedVehicleId} />
          </div>
        )}
      </div>

      {/* Bottom: Event Timeline drawer */}
      {timelineOpen && (
        <div className="h-56 shrink-0 bg-surface-1 border-t border-surface-border overflow-hidden z-10">
          <EventTimeline />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Write Header.tsx**

```tsx
// sentinel/frontend/src/components/layout/Header.tsx
import { useVehiclesStore } from '../../store/vehicles.store'

export default function Header() {
  const vehicles = useVehiclesStore((s) => s.vehicles)
  const connected = Object.values(vehicles).filter((v) => v.connected).length
  const total = Object.values(vehicles).length

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-5
      bg-surface-1 border-b border-surface-border z-20">
      <div className="flex items-center gap-3">
        {/* Logo mark */}
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-violet
          flex items-center justify-center shadow-sm">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z"
              stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="7" cy="7" r="2" fill="white"/>
          </svg>
        </div>
        <span className="font-semibold text-white text-sm tracking-wide">Sentinel</span>
        <span className="text-surface-border text-xs font-mono">Fleet Control Console</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Vehicles</span>
          <span className="text-xs font-mono font-medium text-white">
            {connected}/{total}
          </span>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2
          border border-surface-border">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          <span className="text-xs font-medium text-accent-green">LIVE</span>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 6: Write StatusChip.tsx**

```tsx
// sentinel/frontend/src/components/ui/StatusChip.tsx
import clsx from 'clsx'
import type { DecisionState } from '../../types'

const CONFIG: Record<DecisionState, { label: string; classes: string; dot: string }> = {
  NORMAL: {
    label: 'Normal',
    classes: 'bg-decision-normal/10 text-decision-normal border-decision-normal/30',
    dot: 'bg-decision-normal',
  },
  DEGRADED_SPEED: {
    label: 'Degraded Speed',
    classes: 'bg-decision-degraded/10 text-decision-degraded border-decision-degraded/30',
    dot: 'bg-decision-degraded',
  },
  SAFE_STOP_RECOMMENDED: {
    label: 'Safe Stop',
    classes: 'bg-decision-stop/10 text-decision-stop border-decision-stop/30',
    dot: 'bg-decision-stop animate-pulse',
  },
  REROUTE_RECOMMENDED: {
    label: 'Reroute',
    classes: 'bg-decision-reroute/10 text-decision-reroute border-decision-reroute/30',
    dot: 'bg-decision-reroute',
  },
}

interface Props {
  decision: DecisionState
  size?: 'sm' | 'md'
}

export default function StatusChip({ decision, size = 'md' }: Props) {
  const cfg = CONFIG[decision]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        cfg.classes,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
```

- [ ] **Step 7: Write Badge.tsx**

```tsx
// sentinel/frontend/src/components/ui/Badge.tsx
import clsx from 'clsx'

type Color = 'blue' | 'cyan' | 'violet' | 'green' | 'amber' | 'red' | 'orange' | 'slate'

const colorMap: Record<Color, string> = {
  blue:   'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
  cyan:   'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
  violet: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20',
  green:  'bg-accent-green/10 text-accent-green border-accent-green/20',
  amber:  'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
  red:    'bg-accent-red/10 text-accent-red border-accent-red/20',
  orange: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20',
  slate:  'bg-slate-700/40 text-slate-400 border-slate-700/60',
}

interface Props {
  children: React.ReactNode
  color?: Color
  className?: string
}

export default function Badge({ children, color = 'slate', className }: Props) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border',
      colorMap[color],
      className
    )}>
      {children}
    </span>
  )
}
```

- [ ] **Step 8: Write EmptyState.tsx**

```tsx
// sentinel/frontend/src/components/ui/EmptyState.tsx
interface Props {
  icon?: React.ReactNode
  title: string
  description?: string
}

export default function EmptyState({ icon, title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-surface-2 border border-surface-border
          flex items-center justify-center mb-3 text-slate-500">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-slate-400">{title}</p>
      {description && (
        <p className="text-xs text-slate-600 mt-1 max-w-[200px]">{description}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 9: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: frontend design system, app shell, header, and UI primitives"
```

---

## Task 13: Frontend — State Management and WebSocket Client

**Files:**
- Create: `sentinel/frontend/src/api/http.ts`
- Create: `sentinel/frontend/src/api/ws.ts`
- Create: `sentinel/frontend/src/store/vehicles.store.ts`
- Create: `sentinel/frontend/src/store/events.store.ts`
- Create: `sentinel/frontend/src/store/timeline.store.ts`
- Create: `sentinel/frontend/src/store/ui.store.ts`
- Create: `sentinel/frontend/src/hooks/useWebSocket.ts`

- [ ] **Step 1: Write HTTP API client**

```typescript
// sentinel/frontend/src/api/http.ts
import type { ActiveEvent, VehicleStatus } from '../types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Request failed')
  }
  return res.json()
}

export const api = {
  getEvents: () => request<ActiveEvent[]>('/events'),
  getVehicles: () => request<VehicleStatus[]>('/vehicles'),

  publishEvent: (body: object) =>
    request<ActiveEvent>('/events', { method: 'POST', body: JSON.stringify(body) }),

  clearEvent: (id: string) =>
    request<ActiveEvent>(`/events/${id}`, { method: 'DELETE' }),
}
```

- [ ] **Step 2: Write WebSocket client**

```typescript
// sentinel/frontend/src/api/ws.ts
import type { ServerMessage } from '../types'

type MessageHandler = (msg: ServerMessage) => void

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const handlers: Set<MessageHandler> = new Set()

const WS_URL = `ws://${window.location.hostname}:3001/ws/clients`

function connect() {
  if (ws && ws.readyState <= WebSocket.OPEN) return

  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log('[WS] Connected to Sentinel Manager')
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  }

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as ServerMessage
      handlers.forEach((h) => h(msg))
    } catch {
      console.warn('[WS] Failed to parse message', e.data)
    }
  }

  ws.onclose = () => {
    console.log('[WS] Disconnected, reconnecting in 3s...')
    ws = null
    reconnectTimer = setTimeout(connect, 3000)
  }

  ws.onerror = (e) => {
    console.error('[WS] Error', e)
  }
}

function subscribe(handler: MessageHandler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export const wsClient = { connect, subscribe }
```

- [ ] **Step 3: Write vehicles store**

```typescript
// sentinel/frontend/src/store/vehicles.store.ts
import { create } from 'zustand'
import type { VehicleStatus } from '../types'

interface VehiclesState {
  vehicles: Record<string, VehicleStatus>
  upsertVehicle: (v: VehicleStatus) => void
  setVehicles: (vs: VehicleStatus[]) => void
  setConnected: (vehicleId: string, connected: boolean) => void
}

export const useVehiclesStore = create<VehiclesState>((set) => ({
  vehicles: {},

  upsertVehicle: (v) =>
    set((s) => ({ vehicles: { ...s.vehicles, [v.vehicleId]: v } })),

  setVehicles: (vs) =>
    set({ vehicles: Object.fromEntries(vs.map((v) => [v.vehicleId, v])) }),

  setConnected: (vehicleId, connected) =>
    set((s) => {
      const v = s.vehicles[vehicleId]
      if (!v) return s
      return { vehicles: { ...s.vehicles, [vehicleId]: { ...v, connected } } }
    }),
}))
```

- [ ] **Step 4: Write events store**

```typescript
// sentinel/frontend/src/store/events.store.ts
import { create } from 'zustand'
import type { ActiveEvent } from '../types'

interface EventsState {
  events: Record<string, ActiveEvent>
  setEvents: (events: ActiveEvent[]) => void
  addEvent: (event: ActiveEvent) => void
  clearEvent: (id: string, clearedAt: string) => void
}

export const useEventsStore = create<EventsState>((set) => ({
  events: {},

  setEvents: (events) =>
    set({ events: Object.fromEntries(events.map((e) => [e.id, e])) }),

  addEvent: (event) =>
    set((s) => ({ events: { ...s.events, [event.id]: event } })),

  clearEvent: (id, clearedAt) =>
    set((s) => {
      const e = s.events[id]
      if (!e) return s
      return { events: { ...s.events, [id]: { ...e, active: false, clearedAt } } }
    }),
}))
```

- [ ] **Step 5: Write timeline store**

```typescript
// sentinel/frontend/src/store/timeline.store.ts
import { create } from 'zustand'
import type { TimelineEntry } from '../types'

interface TimelineState {
  entries: TimelineEntry[]
  setEntries: (entries: TimelineEntry[]) => void
  addEntry: (entry: TimelineEntry) => void
}

export const useTimelineStore = create<TimelineState>((set) => ({
  entries: [],

  setEntries: (entries) => set({ entries }),

  addEntry: (entry) =>
    set((s) => ({
      entries: [entry, ...s.entries].slice(0, 300),
    })),
}))
```

- [ ] **Step 6: Write UI store**

```typescript
// sentinel/frontend/src/store/ui.store.ts
import { create } from 'zustand'

type ActivePanel = 'weather' | 'geofence' | 'network' | null

interface UIState {
  selectedVehicleId: string | null
  activePanel: ActivePanel
  timelineOpen: boolean
  isDrawingGeofence: boolean
  setSelectedVehicle: (id: string | null) => void
  setActivePanel: (panel: ActivePanel) => void
  setTimelineOpen: (open: boolean) => void
  setDrawingGeofence: (drawing: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedVehicleId: null,
  activePanel: null,
  timelineOpen: false,
  isDrawingGeofence: false,

  setSelectedVehicle: (id) => set({ selectedVehicleId: id }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setTimelineOpen: (open) => set({ timelineOpen: open }),
  setDrawingGeofence: (drawing) => set({ isDrawingGeofence: drawing }),
}))
```

- [ ] **Step 7: Write useWebSocket hook**

```typescript
// sentinel/frontend/src/hooks/useWebSocket.ts
import { useCallback } from 'react'
import { wsClient } from '../api/ws'
import { useVehiclesStore } from '../store/vehicles.store'
import { useEventsStore } from '../store/events.store'
import { useTimelineStore } from '../store/timeline.store'
import type { ServerMessage } from '../types'

export function useWebSocket() {
  const { upsertVehicle, setVehicles, setConnected } = useVehiclesStore()
  const { addEvent, setEvents, clearEvent } = useEventsStore()
  const { addEntry, setEntries } = useTimelineStore()

  const connect = useCallback(() => {
    wsClient.subscribe((msg: ServerMessage) => {
      switch (msg.type) {
        case 'INIT_STATE':
          setVehicles(msg.vehicles)
          setEvents(msg.events)
          setEntries(msg.timeline)
          break
        case 'VEHICLE_UPDATE':
          upsertVehicle(msg.vehicle)
          break
        case 'EVENT_PUBLISHED':
          addEvent(msg.event)
          break
        case 'EVENT_CLEARED':
          clearEvent(msg.eventId, msg.clearedAt)
          break
        case 'TIMELINE_ENTRY':
          addEntry(msg.entry)
          break
        case 'VEHICLE_CONNECTED':
          setConnected(msg.vehicleId, true)
          break
        case 'VEHICLE_DISCONNECTED':
          setConnected(msg.vehicleId, false)
          break
      }
    })
    wsClient.connect()
  }, [upsertVehicle, setVehicles, setConnected, addEvent, setEvents, clearEvent, addEntry, setEntries])

  return connect
}
```

- [ ] **Step 8: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: frontend state management, WS client, and Zustand stores"
```

---

## Task 14: Frontend — Map Canvas, Vehicle Markers, and Geofence Rendering

**Files:**
- Create: `sentinel/frontend/src/components/map/MapCanvas.tsx`
- Create: `sentinel/frontend/src/components/map/VehicleMarker.tsx`
- Create: `sentinel/frontend/src/components/map/GeofenceLayer.tsx`
- Create: `sentinel/frontend/src/components/map/GeofenceDrawer.tsx`

- [ ] **Step 1: Write MapCanvas.tsx**

```tsx
// sentinel/frontend/src/components/map/MapCanvas.tsx
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import VehicleMarker from './VehicleMarker'
import GeofenceLayer from './GeofenceLayer'
import GeofenceDrawer from './GeofenceDrawer'
import { useVehiclesStore } from '../../store/vehicles.store'
import { useUIStore } from '../../store/ui.store'

// San Francisco as default center
const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194]
const DEFAULT_ZOOM = 13

export default function MapCanvas() {
  const vehicles = useVehiclesStore((s) => s.vehicles)
  const { isDrawingGeofence } = useUIStore()

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      className="bg-surface"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />

      <GeofenceLayer />

      {Object.values(vehicles).map((vehicle) => (
        <VehicleMarker key={vehicle.vehicleId} vehicle={vehicle} />
      ))}

      {isDrawingGeofence && <GeofenceDrawer />}
    </MapContainer>
  )
}
```

- [ ] **Step 2: Write VehicleMarker.tsx**

```tsx
// sentinel/frontend/src/components/map/VehicleMarker.tsx
import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { useUIStore } from '../../store/ui.store'
import StatusChip from '../ui/StatusChip'
import type { VehicleStatus } from '../../types'

const DECISION_COLORS: Record<string, string> = {
  NORMAL: '#10b981',
  DEGRADED_SPEED: '#f59e0b',
  SAFE_STOP_RECOMMENDED: '#ef4444',
  REROUTE_RECOMMENDED: '#8b5cf6',
}

function createVehicleIcon(decision: string, connected: boolean, heading: number): L.DivIcon {
  const color = connected ? (DECISION_COLORS[decision] ?? '#3b82f6') : '#4b5563'
  const arrowSvg = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
      style="transform: rotate(${heading}deg); transform-origin: center;">
      <circle cx="16" cy="16" r="13" fill="${color}22" stroke="${color}" stroke-width="2"/>
      <path d="M16 8 L20 22 L16 19 L12 22 Z" fill="${color}"/>
      ${!connected ? `<circle cx="22" cy="10" r="5" fill="#1e2536" stroke="#4b5563" stroke-width="1.5"/>
        <line x1="19.5" y1="7.5" x2="24.5" y2="12.5" stroke="#9ca3af" stroke-width="1.5"/>` : ''}
    </svg>
  `
  return L.divIcon({
    html: arrowSvg,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

interface Props {
  vehicle: VehicleStatus
}

export default function VehicleMarker({ vehicle }: Props) {
  const { setSelectedVehicle, selectedVehicleId } = useUIStore()
  const isSelected = selectedVehicleId === vehicle.vehicleId
  const icon = createVehicleIcon(vehicle.decision, vehicle.connected, vehicle.position.heading)

  return (
    <Marker
      position={[vehicle.position.lat, vehicle.position.lng]}
      icon={icon}
      eventHandlers={{
        click: () => setSelectedVehicle(
          isSelected ? null : vehicle.vehicleId
        ),
      }}
    >
      <Tooltip
        permanent={isSelected}
        direction="top"
        offset={[0, -18]}
        className="!bg-surface-2 !border-surface-border !text-white !text-xs !rounded-lg !shadow-panel"
      >
        <div className="flex flex-col gap-0.5 p-0.5">
          <span className="font-medium font-mono">{vehicle.vehicleId}</span>
          <span className="text-slate-400">{vehicle.speedKmh.toFixed(0)} km/h</span>
        </div>
      </Tooltip>
    </Marker>
  )
}
```

- [ ] **Step 3: Write GeofenceLayer.tsx**

```tsx
// sentinel/frontend/src/components/map/GeofenceLayer.tsx
import { Polygon, Tooltip } from 'react-leaflet'
import { useEventsStore } from '../../store/events.store'
import type { GeofencePayload, ActiveEvent } from '../../types'

const GEOFENCE_STYLES: Record<string, { color: string; fillColor: string; fillOpacity: number }> = {
  FORBIDDEN: { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.12 },
  CAUTION:   { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.10 },
  SLOW:      { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.10 },
}

export default function GeofenceLayer() {
  const events = useEventsStore((s) => s.events)

  const geofenceEvents = Object.values(events).filter(
    (e): e is ActiveEvent & { payload: GeofencePayload } =>
      e.type === 'GEOFENCE' && e.active
  )

  return (
    <>
      {geofenceEvents.map((event) => {
        const p = event.payload as GeofencePayload
        const positions = p.polygon.map((pt) => [pt.lat, pt.lng] as [number, number])
        const style = GEOFENCE_STYLES[p.type] ?? GEOFENCE_STYLES.CAUTION

        return (
          <Polygon
            key={event.id}
            positions={positions}
            pathOptions={{
              color: style.color,
              fillColor: style.fillColor,
              fillOpacity: style.fillOpacity,
              weight: 2,
              dashArray: p.type === 'FORBIDDEN' ? undefined : '6 4',
            }}
          >
            <Tooltip sticky>
              <div className="text-xs">
                <div className="font-medium">{p.type} ZONE</div>
                {p.label && <div className="text-slate-400">{p.label}</div>}
              </div>
            </Tooltip>
          </Polygon>
        )
      })}
    </>
  )
}
```

- [ ] **Step 4: Write GeofenceDrawer.tsx**

```tsx
// sentinel/frontend/src/components/map/GeofenceDrawer.tsx
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import { useUIStore } from '../../store/ui.store'
import type { LatLng } from '../../types'

interface Props {
  onPolygonDrawn?: (coords: LatLng[]) => void
}

export default function GeofenceDrawer({ onPolygonDrawn }: Props) {
  const map = useMap()
  const { setDrawingGeofence } = useUIStore()

  useEffect(() => {
    // Initialize Geoman
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
    })

    // Style the toolbar (Geoman adds its own DOM elements)
    map.pm.setGlobalOptions({
      pathOptions: {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 2,
      },
    })

    const handleCreate = (e: any) => {
      const layer = e.layer as L.Polygon
      const latLngs = (layer.getLatLngs()[0] as L.LatLng[]).map((ll) => ({
        lat: ll.lat,
        lng: ll.lng,
      }))
      onPolygonDrawn?.(latLngs)
      // Remove drawn layer — geofence will be re-rendered by GeofenceLayer
      map.removeLayer(layer)
      setDrawingGeofence(false)
      map.pm.disableDraw()
    }

    map.on('pm:create', handleCreate)

    // Auto-start polygon draw mode
    map.pm.enableDraw('Polygon')

    return () => {
      map.pm.removeControls()
      map.off('pm:create', handleCreate)
      map.pm.disableDraw()
    }
  }, [map, onPolygonDrawn, setDrawingGeofence])

  return null
}
```

- [ ] **Step 5: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: map canvas, vehicle markers, geofence rendering, and polygon drawing"
```

---

## Task 15: Frontend — Control Panel and Event Forms

**Files:**
- Create: `sentinel/frontend/src/components/control/ControlPanel.tsx`
- Create: `sentinel/frontend/src/components/control/WeatherForm.tsx`
- Create: `sentinel/frontend/src/components/control/GeofenceForm.tsx`
- Create: `sentinel/frontend/src/components/control/NetworkForm.tsx`
- Create: `sentinel/frontend/src/components/control/ActiveConstraints.tsx`

- [ ] **Step 1: Write ControlPanel.tsx**

```tsx
// sentinel/frontend/src/components/control/ControlPanel.tsx
import { useState } from 'react'
import WeatherForm from './WeatherForm'
import GeofenceForm from './GeofenceForm'
import NetworkForm from './NetworkForm'
import ActiveConstraints from './ActiveConstraints'

type Tab = 'constraints' | 'weather' | 'geofence' | 'network'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'constraints', label: 'Active', icon: '◈' },
  { id: 'weather',     label: 'Weather', icon: '⛈' },
  { id: 'geofence',    label: 'Geofence', icon: '⬡' },
  { id: 'network',     label: 'Network', icon: '⊟' },
]

export default function ControlPanel() {
  const [tab, setTab] = useState<Tab>('constraints')

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-4 pt-4 pb-3 border-b border-surface-border">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Operator Console
        </h2>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-surface-border px-2 pt-2 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-t-lg text-xs
              transition-colors
              ${tab === t.id
                ? 'bg-surface-2 text-white border border-b-0 border-surface-border'
                : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {tab === 'constraints' && <ActiveConstraints />}
        {tab === 'weather'     && <WeatherForm />}
        {tab === 'geofence'    && <GeofenceForm />}
        {tab === 'network'     && <NetworkForm />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write shared form styles helper (inline)**

The forms share a common field style. Use a local helper within each form:

```
// Used in all forms — Tailwind classes for form elements:
// Label:  text-xs font-medium text-slate-400 mb-1
// Input:  w-full px-3 py-2 rounded-lg bg-surface text-sm text-white
//         border border-surface-border focus:border-accent-blue focus:outline-none
//         focus:ring-1 focus:ring-accent-blue/30 transition-colors
// Select: same as Input + appearance-none
// Button submit: w-full py-2.5 rounded-lg bg-accent-blue hover:bg-blue-500
//         text-white text-sm font-semibold transition-colors disabled:opacity-50
```

- [ ] **Step 3: Write WeatherForm.tsx**

```tsx
// sentinel/frontend/src/components/control/WeatherForm.tsx
import { useState } from 'react'
import { api } from '../../api/http'

const CONDITIONS = ['HEAVY_RAIN', 'FOG', 'STRONG_WIND', 'LOW_VISIBILITY', 'SNOW', 'ICE'] as const
const SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'EXTREME'] as const

const inputCls = "w-full px-3 py-2 rounded-lg bg-surface text-sm text-white border border-surface-border focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/30 transition-colors"
const labelCls = "block text-xs font-medium text-slate-400 mb-1"

export default function WeatherForm() {
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>('HEAVY_RAIN')
  const [severity, setSeverity] = useState<typeof SEVERITIES[number]>('MODERATE')
  const [duration, setDuration] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.publishEvent({
        type: 'WEATHER',
        payload: {
          condition,
          severity,
          ...(duration ? { durationMinutes: parseInt(duration, 10) } : {}),
        },
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-xs text-slate-500 mb-4">
        Publish a weather condition that affects all vehicles.
      </div>

      <div>
        <label className={labelCls}>Condition</label>
        <select value={condition} onChange={(e) => setCondition(e.target.value as any)}
          className={`${inputCls} appearance-none`}>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{c.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Severity</label>
        <div className="grid grid-cols-4 gap-1">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={`py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${severity === s
                  ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                  : 'bg-surface border-surface-border text-slate-500 hover:text-white'
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Duration (minutes, optional)</label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g. 30"
          min={1}
          className={inputCls}
        />
      </div>

      {error && <p className="text-xs text-accent-red">{error}</p>}

      <button type="submit" disabled={submitting}
        className="w-full py-2.5 rounded-lg bg-accent-blue hover:bg-blue-500
          text-white text-sm font-semibold transition-colors disabled:opacity-50">
        {submitting ? 'Publishing…' : 'Publish Weather Event'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Write GeofenceForm.tsx**

```tsx
// sentinel/frontend/src/components/control/GeofenceForm.tsx
import { useState } from 'react'
import { api } from '../../api/http'
import { useUIStore } from '../../store/ui.store'
import type { LatLng } from '../../types'

const GEOFENCE_TYPES = ['FORBIDDEN', 'CAUTION', 'SLOW'] as const

const TYPE_DESCRIPTIONS: Record<string, string> = {
  FORBIDDEN: 'Vehicle must stop if inside this zone.',
  CAUTION:   'Vehicle must slow down and proceed with caution.',
  SLOW:      'Vehicle must reduce speed inside this zone.',
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-surface text-sm text-white border border-surface-border focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/30 transition-colors"
const labelCls = "block text-xs font-medium text-slate-400 mb-1"

export default function GeofenceForm() {
  const [type, setType] = useState<typeof GEOFENCE_TYPES[number]>('CAUTION')
  const [label, setLabel] = useState('')
  const [polygon, setPolygon] = useState<LatLng[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isDrawingGeofence, setDrawingGeofence } = useUIStore()

  // Listen for polygon from map drawer via global store
  // (GeofenceDrawer sets polygon through a callback we wire up)
  // For MVP: polygon is populated by the map drawer via store

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (polygon.length < 3) {
      setError('Draw a polygon on the map first (at least 3 points).')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api.publishEvent({
        type: 'GEOFENCE',
        payload: {
          type,
          polygon,
          ...(label ? { label } : {}),
        },
      })
      setPolygon([])
      setLabel('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-xs text-slate-500 mb-2">
        Draw a polygon on the map, then configure and publish a geofence.
      </div>

      <div>
        <label className={labelCls}>Zone Type</label>
        <div className="space-y-1.5">
          {GEOFENCE_TYPES.map((t) => (
            <label key={t} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors
              ${type === t
                ? 'border-accent-blue bg-accent-blue/5'
                : 'border-surface-border hover:border-slate-600'}`}>
              <input type="radio" name="type" value={t}
                checked={type === t} onChange={() => setType(t)}
                className="mt-0.5 accent-accent-blue" />
              <div>
                <div className="text-xs font-semibold text-white">{t}</div>
                <div className="text-xs text-slate-500">{TYPE_DESCRIPTIONS[t]}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Label (optional)</label>
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Construction Zone A" className={inputCls} />
      </div>

      {/* Draw on map button */}
      <button
        type="button"
        onClick={() => setDrawingGeofence(!isDrawingGeofence)}
        className={`w-full py-2.5 rounded-lg border text-sm font-semibold transition-colors
          ${isDrawingGeofence
            ? 'bg-accent-orange/10 border-accent-orange text-accent-orange'
            : 'bg-surface-2 border-surface-border text-slate-300 hover:text-white hover:border-slate-500'
          }`}
      >
        {isDrawingGeofence ? '⬡ Drawing… (click on map)' : '⬡ Draw Polygon on Map'}
      </button>

      {polygon.length >= 3 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-green/10
          border border-accent-green/20">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
          <span className="text-xs text-accent-green">{polygon.length} points captured</span>
          <button type="button" onClick={() => setPolygon([])}
            className="ml-auto text-xs text-slate-500 hover:text-slate-300">clear</button>
        </div>
      )}

      {error && <p className="text-xs text-accent-red">{error}</p>}

      <button type="submit" disabled={submitting || polygon.length < 3}
        className="w-full py-2.5 rounded-lg bg-accent-blue hover:bg-blue-500
          text-white text-sm font-semibold transition-colors disabled:opacity-50">
        {submitting ? 'Publishing…' : 'Publish Geofence'}
      </button>
    </form>
  )
}
```

Wire the map polygon drawn callback into GeofenceForm. The cleanest MVP approach: extend `ui.store` to hold a `pendingPolygon` field:

```typescript
// Add to ui.store.ts:
  pendingPolygon: LatLng[] | null
  setPendingPolygon: (polygon: LatLng[] | null) => void

// In state:
  pendingPolygon: null,
  setPendingPolygon: (polygon) => set({ pendingPolygon: polygon }),
```

Update `GeofenceDrawer.tsx` to call `setPendingPolygon` from ui.store instead of the prop callback:

```tsx
// In GeofenceDrawer.tsx, in handleCreate:
const { setDrawingGeofence, setPendingPolygon } = useUIStore()
// ...
setPendingPolygon(latLngs)
```

Update `GeofenceForm.tsx` to read from `pendingPolygon` in ui.store:

```tsx
// In GeofenceForm.tsx:
const { isDrawingGeofence, setDrawingGeofence, pendingPolygon, setPendingPolygon } = useUIStore()
// Replace local polygon state with pendingPolygon from store
// In handleSubmit: use pendingPolygon instead of polygon
// On successful publish: call setPendingPolygon(null)
```

Full updated GeofenceForm.tsx:

```tsx
// sentinel/frontend/src/components/control/GeofenceForm.tsx (final)
import { useState } from 'react'
import { api } from '../../api/http'
import { useUIStore } from '../../store/ui.store'

const GEOFENCE_TYPES = ['FORBIDDEN', 'CAUTION', 'SLOW'] as const

const TYPE_DESCRIPTIONS: Record<string, string> = {
  FORBIDDEN: 'Vehicle must stop if inside this zone.',
  CAUTION:   'Vehicle must slow down and proceed with caution.',
  SLOW:      'Vehicle must reduce speed inside this zone.',
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-surface text-sm text-white border border-surface-border focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/30 transition-colors"
const labelCls = "block text-xs font-medium text-slate-400 mb-1"

export default function GeofenceForm() {
  const [type, setType] = useState<typeof GEOFENCE_TYPES[number]>('CAUTION')
  const [label, setLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const {
    isDrawingGeofence, setDrawingGeofence,
    pendingPolygon, setPendingPolygon
  } = useUIStore()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pendingPolygon || pendingPolygon.length < 3) {
      setError('Draw a polygon on the map first (at least 3 points).')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api.publishEvent({
        type: 'GEOFENCE',
        payload: {
          type,
          polygon: pendingPolygon,
          ...(label ? { label } : {}),
        },
      })
      setPendingPolygon(null)
      setLabel('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-xs text-slate-500 mb-2">
        Draw a polygon on the map, then configure and publish a geofence.
      </div>
      <div>
        <label className={labelCls}>Zone Type</label>
        <div className="space-y-1.5">
          {GEOFENCE_TYPES.map((t) => (
            <label key={t} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors
              ${type === t ? 'border-accent-blue bg-accent-blue/5' : 'border-surface-border hover:border-slate-600'}`}>
              <input type="radio" name="type" value={t} checked={type === t}
                onChange={() => setType(t)} className="mt-0.5 accent-accent-blue" />
              <div>
                <div className="text-xs font-semibold text-white">{t}</div>
                <div className="text-xs text-slate-500">{TYPE_DESCRIPTIONS[t]}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Label (optional)</label>
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Construction Zone A" className={inputCls} />
      </div>
      <button type="button" onClick={() => setDrawingGeofence(!isDrawingGeofence)}
        className={`w-full py-2.5 rounded-lg border text-sm font-semibold transition-colors
          ${isDrawingGeofence
            ? 'bg-accent-orange/10 border-accent-orange text-accent-orange'
            : 'bg-surface-2 border-surface-border text-slate-300 hover:text-white hover:border-slate-500'}`}>
        {isDrawingGeofence ? '⬡ Drawing… (click on map)' : '⬡ Draw Polygon on Map'}
      </button>
      {pendingPolygon && pendingPolygon.length >= 3 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-green/10 border border-accent-green/20">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
          <span className="text-xs text-accent-green">{pendingPolygon.length} points captured</span>
          <button type="button" onClick={() => setPendingPolygon(null)}
            className="ml-auto text-xs text-slate-500 hover:text-slate-300">clear</button>
        </div>
      )}
      {error && <p className="text-xs text-accent-red">{error}</p>}
      <button type="submit" disabled={submitting || !pendingPolygon || pendingPolygon.length < 3}
        className="w-full py-2.5 rounded-lg bg-accent-blue hover:bg-blue-500
          text-white text-sm font-semibold transition-colors disabled:opacity-50">
        {submitting ? 'Publishing…' : 'Publish Geofence'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Write NetworkForm.tsx**

```tsx
// sentinel/frontend/src/components/control/NetworkForm.tsx
import { useState } from 'react'
import { api } from '../../api/http'
import { useVehiclesStore } from '../../store/vehicles.store'

const SEVERITIES = ['DEGRADED', 'UNSTABLE', 'LOST'] as const

const SEVERITY_DESCRIPTIONS: Record<string, string> = {
  DEGRADED: 'Reduced bandwidth — degraded speed mode.',
  UNSTABLE: 'Intermittent connection — degraded speed mode.',
  LOST:     'No connection — safe stop recommended.',
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-surface text-sm text-white border border-surface-border focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/30 transition-colors"
const labelCls = "block text-xs font-medium text-slate-400 mb-1"

export default function NetworkForm() {
  const vehicles = useVehiclesStore((s) => s.vehicles)
  const [severity, setSeverity] = useState<typeof SEVERITIES[number]>('DEGRADED')
  const [targetVehicle, setTargetVehicle] = useState('all')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.publishEvent({
        type: 'NETWORK',
        payload: {
          severity,
          ...(targetVehicle !== 'all' ? { vehicleId: targetVehicle } : {}),
        },
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-xs text-slate-500 mb-2">
        Simulate a network degradation event for one or all vehicles.
      </div>

      <div>
        <label className={labelCls}>Severity</label>
        <div className="space-y-1.5">
          {SEVERITIES.map((s) => (
            <label key={s} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors
              ${severity === s ? 'border-accent-blue bg-accent-blue/5' : 'border-surface-border hover:border-slate-600'}`}>
              <input type="radio" name="severity" value={s} checked={severity === s}
                onChange={() => setSeverity(s)} className="mt-0.5 accent-accent-blue" />
              <div>
                <div className="text-xs font-semibold text-white">{s}</div>
                <div className="text-xs text-slate-500">{SEVERITY_DESCRIPTIONS[s]}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Target</label>
        <select value={targetVehicle} onChange={(e) => setTargetVehicle(e.target.value)}
          className={`${inputCls} appearance-none`}>
          <option value="all">All Vehicles (global)</option>
          {Object.keys(vehicles).map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-accent-red">{error}</p>}

      <button type="submit" disabled={submitting}
        className="w-full py-2.5 rounded-lg bg-accent-blue hover:bg-blue-500
          text-white text-sm font-semibold transition-colors disabled:opacity-50">
        {submitting ? 'Publishing…' : 'Publish Network Event'}
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Write ActiveConstraints.tsx**

```tsx
// sentinel/frontend/src/components/control/ActiveConstraints.tsx
import { api } from '../../api/http'
import { useEventsStore } from '../../store/events.store'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import type { ActiveEvent, GeofencePayload, NetworkPayload, WeatherPayload } from '../../types'

function eventSummary(event: ActiveEvent): { label: string; detail: string; color: 'red' | 'amber' | 'blue' | 'orange' } {
  if (event.type === 'WEATHER') {
    const p = event.payload as WeatherPayload
    return {
      label: `Weather: ${p.condition.replace('_', ' ')}`,
      detail: `Severity: ${p.severity}`,
      color: p.severity === 'HIGH' || p.severity === 'EXTREME' ? 'red' : 'amber',
    }
  }
  if (event.type === 'GEOFENCE') {
    const p = event.payload as GeofencePayload
    return {
      label: `Geofence: ${p.type}${p.label ? ` — ${p.label}` : ''}`,
      detail: `${p.polygon.length} vertices`,
      color: p.type === 'FORBIDDEN' ? 'red' : p.type === 'CAUTION' ? 'amber' : 'blue',
    }
  }
  const p = event.payload as NetworkPayload
  return {
    label: `Network: ${p.severity}`,
    detail: p.vehicleId ? `Vehicle: ${p.vehicleId}` : 'Global',
    color: p.severity === 'LOST' ? 'red' : 'orange',
  }
}

export default function ActiveConstraints() {
  const events = useEventsStore((s) => s.events)
  const active = Object.values(events).filter((e) => e.active)

  if (active.length === 0) {
    return (
      <EmptyState
        icon={<span className="text-base">◈</span>}
        title="No active constraints"
        description="Publish a weather, geofence, or network event using the tabs above."
      />
    )
  }

  async function handleClear(id: string) {
    await api.clearEvent(id)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3">
        {active.length} active constraint{active.length !== 1 ? 's' : ''} — affecting connected vehicles
      </p>
      {active.map((event) => {
        const { label, detail, color } = eventSummary(event)
        return (
          <div key={event.id}
            className="flex items-start gap-3 p-3 rounded-xl bg-surface-2
              border border-surface-border group">
            <Badge color={color}>{event.type}</Badge>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
            </div>
            <button
              onClick={() => handleClear(event.id)}
              className="shrink-0 text-xs text-slate-600 hover:text-accent-red
                transition-colors opacity-0 group-hover:opacity-100"
            >
              clear
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: control panel with weather, geofence, and network event forms"
```

---

## Task 16: Frontend — Vehicle Panel and Event Timeline

**Files:**
- Create: `sentinel/frontend/src/components/vehicle/VehiclePanel.tsx`
- Create: `sentinel/frontend/src/components/vehicle/DecisionBadge.tsx`
- Create: `sentinel/frontend/src/components/vehicle/ConstraintList.tsx`
- Create: `sentinel/frontend/src/components/timeline/EventTimeline.tsx`
- Create: `sentinel/frontend/src/components/timeline/TimelineItem.tsx`

- [ ] **Step 1: Write DecisionBadge.tsx**

```tsx
// sentinel/frontend/src/components/vehicle/DecisionBadge.tsx
import type { DecisionState } from '../../types'

const CONFIG: Record<DecisionState, {
  icon: string; label: string; sublabel: string
  ring: string; bg: string; text: string
}> = {
  NORMAL: {
    icon: '●', label: 'Normal', sublabel: 'All systems nominal',
    ring: 'ring-decision-normal/40', bg: 'bg-decision-normal/10', text: 'text-decision-normal',
  },
  DEGRADED_SPEED: {
    icon: '▼', label: 'Degraded Speed', sublabel: 'Speed profile reduced',
    ring: 'ring-decision-degraded/40', bg: 'bg-decision-degraded/10', text: 'text-decision-degraded',
  },
  SAFE_STOP_RECOMMENDED: {
    icon: '⬛', label: 'Safe Stop', sublabel: 'Recommend immediate stop',
    ring: 'ring-decision-stop/40 ring-2 ring-offset-2 ring-offset-surface-1', bg: 'bg-decision-stop/10', text: 'text-decision-stop',
  },
  REROUTE_RECOMMENDED: {
    icon: '⟳', label: 'Reroute', sublabel: 'Alternative route recommended',
    ring: 'ring-decision-reroute/40', bg: 'bg-decision-reroute/10', text: 'text-decision-reroute',
  },
}

export default function DecisionBadge({ decision }: { decision: DecisionState }) {
  const cfg = CONFIG[decision]
  return (
    <div className={`flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl
      ${cfg.bg} ring-1 ${cfg.ring} text-center`}>
      <span className={`text-2xl ${cfg.text}`}>{cfg.icon}</span>
      <span className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</span>
      <span className="text-xs text-slate-500">{cfg.sublabel}</span>
    </div>
  )
}
```

- [ ] **Step 2: Write ConstraintList.tsx**

```tsx
// sentinel/frontend/src/components/vehicle/ConstraintList.tsx
import { useEventsStore } from '../../store/events.store'
import Badge from '../ui/Badge'
import type { GeofencePayload, NetworkPayload, WeatherPayload } from '../../types'

interface Props {
  constraintIds: string[]
}

export default function ConstraintList({ constraintIds }: Props) {
  const events = useEventsStore((s) => s.events)
  const constraints = constraintIds.map((id) => events[id]).filter(Boolean)

  if (constraints.length === 0) {
    return <p className="text-xs text-slate-600 italic">No active constraints affecting this vehicle.</p>
  }

  return (
    <div className="space-y-1.5">
      {constraints.map((c) => {
        const label =
          c.type === 'WEATHER' ? (c.payload as WeatherPayload).condition.replace('_', ' ')
          : c.type === 'GEOFENCE' ? `${(c.payload as GeofencePayload).type} ZONE`
          : `NETWORK ${(c.payload as NetworkPayload).severity}`
        return (
          <div key={c.id} className="flex items-center gap-2">
            <Badge color={c.type === 'WEATHER' ? 'amber' : c.type === 'GEOFENCE' ? 'red' : 'orange'}>
              {c.type}
            </Badge>
            <span className="text-xs text-slate-300">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Write VehiclePanel.tsx**

```tsx
// sentinel/frontend/src/components/vehicle/VehiclePanel.tsx
import { useVehiclesStore } from '../../store/vehicles.store'
import { useUIStore } from '../../store/ui.store'
import StatusChip from '../ui/StatusChip'
import DecisionBadge from './DecisionBadge'
import ConstraintList from './ConstraintList'
import Badge from '../ui/Badge'

interface Props {
  vehicleId: string
}

export default function VehiclePanel({ vehicleId }: Props) {
  const vehicle = useVehiclesStore((s) => s.vehicles[vehicleId])
  const { setSelectedVehicle } = useUIStore()

  if (!vehicle) return null

  const reasonLabels: Record<string, string> = {
    WEATHER_HEAVY_RAIN: 'Heavy Rain',
    WEATHER_LOW_VISIBILITY: 'Low Visibility',
    WEATHER_STRONG_WIND: 'Strong Wind',
    WEATHER_FOG: 'Fog',
    GEOFENCE_AHEAD: 'Geofence Ahead',
    IN_GEOFENCE_FORBIDDEN_ZONE: 'In Forbidden Zone',
    IN_GEOFENCE_SLOW_ZONE: 'In Slow Zone',
    IN_GEOFENCE_CAUTION_ZONE: 'In Caution Zone',
    NETWORK_POOR: 'Poor Network',
    NETWORK_LOST: 'Network Lost',
    MULTI_FACTOR_RISK: 'Multiple Factors',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-surface-border">
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Vehicle</h2>
          <p className="text-sm font-bold text-white font-mono mt-0.5">{vehicleId}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${vehicle.connected ? 'bg-accent-green' : 'bg-slate-600'}`} />
          <span className="text-xs text-slate-500">{vehicle.connected ? 'Connected' : 'Offline'}</span>
          <button onClick={() => setSelectedVehicle(null)}
            className="ml-2 text-slate-600 hover:text-white text-xs transition-colors">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-5">
        {/* Decision */}
        <DecisionBadge decision={vehicle.decision} />

        {/* Telemetry */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-surface-2 border border-surface-border">
            <p className="text-xs text-slate-500 mb-1">Speed</p>
            <p className="text-lg font-bold text-white font-mono">{vehicle.speedKmh.toFixed(0)}</p>
            <p className="text-xs text-slate-600">km/h</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-2 border border-surface-border">
            <p className="text-xs text-slate-500 mb-1">Heading</p>
            <p className="text-lg font-bold text-white font-mono">{vehicle.position.heading.toFixed(0)}°</p>
            <p className="text-xs text-slate-600">bearing</p>
          </div>
          <div className="col-span-2 p-3 rounded-xl bg-surface-2 border border-surface-border">
            <p className="text-xs text-slate-500 mb-1">Position</p>
            <p className="text-xs font-mono text-white">
              {vehicle.position.lat.toFixed(5)}, {vehicle.position.lng.toFixed(5)}
            </p>
          </div>
        </div>

        {/* Reason codes */}
        {vehicle.reasonCodes.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Active Reasons
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {vehicle.reasonCodes.map((code) => (
                <Badge key={code}
                  color={
                    code.startsWith('WEATHER') ? 'amber'
                    : code.startsWith('GEOFENCE') || code.startsWith('IN_GEOFENCE') ? 'red'
                    : code.startsWith('NETWORK') ? 'orange'
                    : 'violet'
                  }>
                  {reasonLabels[code] ?? code}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Active constraints */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
            Affecting Constraints
          </h3>
          <ConstraintList constraintIds={vehicle.activeConstraintIds} />
        </div>

        {/* Last seen */}
        <div className="pt-2 border-t border-surface-border">
          <p className="text-xs text-slate-600">
            Last update: {new Date(vehicle.lastSeenAt).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write TimelineItem.tsx**

```tsx
// sentinel/frontend/src/components/timeline/TimelineItem.tsx
import type { TimelineEntry } from '../../types'
import Badge from '../ui/Badge'
import { formatDistanceToNow } from 'date-fns'

const CATEGORY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  OPERATOR_ACTION:  { label: 'Operator', color: 'cyan',   dot: 'bg-accent-cyan' },
  BACKEND_EVENT:    { label: 'Backend',  color: 'blue',   dot: 'bg-accent-blue' },
  SENTINEL_RECEIPT: { label: 'Receipt',  color: 'violet', dot: 'bg-accent-violet' },
  SENTINEL_DECISION:{ label: 'Decision', color: 'amber',  dot: 'bg-accent-amber' },
  SENTINEL_REPORT:  { label: 'Report',   color: 'slate',  dot: 'bg-slate-500' },
}

interface Props {
  entry: TimelineEntry
}

export default function TimelineItem({ entry }: Props) {
  const cfg = CATEGORY_CONFIG[entry.category] ?? CATEGORY_CONFIG.SENTINEL_REPORT

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-surface-2/50 transition-colors group">
      {/* Dot */}
      <div className="mt-1.5 shrink-0 flex flex-col items-center">
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge color={cfg.color as any}>{cfg.label}</Badge>
          {entry.vehicleId && (
            <span className="text-xs font-mono text-slate-500">{entry.vehicleId}</span>
          )}
          <span className="ml-auto text-xs text-slate-600 shrink-0">
            {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
          </span>
        </div>
        <p className="text-xs font-medium text-white truncate">{entry.title}</p>
        <p className="text-xs text-slate-500 truncate">{entry.detail}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write EventTimeline.tsx**

```tsx
// sentinel/frontend/src/components/timeline/EventTimeline.tsx
import { useTimelineStore } from '../../store/timeline.store'
import TimelineItem from './TimelineItem'

export default function EventTimeline() {
  const entries = useTimelineStore((s) => s.entries)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Event Timeline
          </h2>
          <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-surface-2
            border border-surface-border text-slate-500">
            {entries.length}
          </span>
        </div>
        <span className="text-xs text-slate-600">newest first</span>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-surface-border/50">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-slate-600">
              Waiting for events… publish a constraint or connect a Sentinel mock.
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <TimelineItem key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: vehicle panel, decision badge, constraint list, and event timeline"
```

---

## Task 17: Makefile and README

**Files:**
- Create: `sentinel/Makefile`
- Create: `sentinel/README.md`

- [ ] **Step 1: Write Makefile**

```makefile
# sentinel/Makefile
.PHONY: install dev frontend backend mock mock-2 test clean venv-setup venv-activate

# ── Config ────────────────────────────────────────────────────────────────────
VEHICLE_ID   ?= vehicle-001
BACKEND_URL  ?= ws://localhost:3001/ws/sentinels
START_LAT    ?= 37.7749
START_LNG    ?= -122.4194

MOCK_DIR     := sentinel-mock
VENV         := $(MOCK_DIR)/.venv
PYTHON       := $(VENV)/bin/python
PIP          := $(VENV)/bin/pip

# ── Install ───────────────────────────────────────────────────────────────────
install: install-backend install-frontend venv-setup
	@echo ""
	@echo "✓ All dependencies installed."
	@echo "  Run 'make dev' to start all services."

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

# ── Development (all services) ────────────────────────────────────────────────
dev:
	@echo "→ Starting Sentinel (backend + frontend)"
	@echo "  Use separate terminals for Sentinel mock(s)."
	$(MAKE) -j2 backend frontend

# ── Individual services ───────────────────────────────────────────────────────
backend:
	cd backend && npm run dev

frontend:
	cd frontend && npm run dev

# ── Mock vehicles ─────────────────────────────────────────────────────────────
# Usage: make mock VEHICLE_ID=vehicle-001 START_LAT=37.77 START_LNG=-122.41
mock: venv-check
	$(PYTHON) -m sentinel.main \
		--vehicle-id $(VEHICLE_ID) \
		--backend-url $(BACKEND_URL) \
		--lat $(START_LAT) \
		--lng $(START_LNG)

# Convenience: launch two mocks in parallel (in the same terminal)
mock-2: venv-check
	$(MAKE) -j2 \
		"mock VEHICLE_ID=vehicle-001 START_LAT=37.7749 START_LNG=-122.4194" \
		"mock VEHICLE_ID=vehicle-002 START_LAT=37.7849 START_LNG=-122.4094"

# ── Test ──────────────────────────────────────────────────────────────────────
test: test-backend test-mock

test-backend:
	cd backend && npm test

test-mock: venv-check
	cd $(MOCK_DIR) && ../$(PYTHON) -m pytest tests/ -v

# ── Helpers ───────────────────────────────────────────────────────────────────
venv-check:
	@test -f $(PYTHON) || (echo "ERROR: venv not found. Run 'make venv-setup' first." && exit 1)

# ── Clean ─────────────────────────────────────────────────────────────────────
clean:
	@echo "→ Cleaning build artifacts..."
	rm -rf backend/dist backend/node_modules
	rm -rf frontend/dist frontend/node_modules
	rm -rf $(MOCK_DIR)/.venv
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	@echo "✓ Clean complete."
```

- [ ] **Step 2: Write README.md**

```markdown
# Sentinel — Fleet Control Console

A real-time monitoring and control console for autonomous/teleoperated vehicles.
Demonstrates the full operator → backend → Sentinel mock → UI decision loop.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (UI)                          │
│  Map Canvas · Control Panel · Vehicle Panel · Timeline   │
└────────────────────┬─────────────────────────────────────┘
                     │ WebSocket /ws/clients (real-time)
                     │ HTTP /api/* (operator actions)
┌────────────────────▼─────────────────────────────────────┐
│               Sentinel Manager (Backend)                 │
│  Fastify · Event/Vehicle/Timeline domains · Broadcaster  │
└────────────────────┬─────────────────────────────────────┘
                     │ WebSocket /ws/sentinels
          ┌──────────┴──────────┐
          ▼                     ▼
  ┌───────────────┐    ┌───────────────┐
  │ Sentinel Mock │    │ Sentinel Mock │  (as many as needed)
  │  vehicle-001  │    │  vehicle-002  │
  └───────────────┘    └───────────────┘
```

**Communication:** All real-time communication uses WebSocket.
- Frontend connects to `/ws/clients` — receives state snapshots and live updates.
- Sentinel mocks connect to `/ws/sentinels` — bidirectional constraint push and status reporting.
- Operator actions (publish/clear events) go through the HTTP REST API.

## Requirements

- Node.js 20+
- Python 3.11+
- npm 9+

## Quick Start

```bash
# 1. Install all dependencies
make install

# 2. Start backend + frontend (in one terminal)
make dev

# 3. Start a Sentinel mock (in a new terminal)
make mock VEHICLE_ID=vehicle-001

# 4. Start a second mock (in another terminal)
make mock VEHICLE_ID=vehicle-002 START_LAT=37.7849 START_LNG=-122.4094
```

Open http://localhost:5173 in your browser.

## Individual Commands

```bash
# Backend only (port 3001)
make backend

# Frontend only (port 5173)
make frontend

# Single mock vehicle
make mock VEHICLE_ID=vehicle-001

# Mock with custom position
make mock VEHICLE_ID=vehicle-003 START_LAT=40.7128 START_LNG=-74.0060

# Run all tests
make test

# Clean everything
make clean
```

## Demo Loop

1. Open http://localhost:5173
2. Start one or two mock vehicles with `make mock`
3. Vehicles appear on the map, moving in a loop
4. Use the **Control Panel** (left sidebar) to publish events:
   - **Weather tab** → publish heavy rain, fog, etc.
   - **Geofence tab** → draw a polygon on the map → publish as forbidden/slow/caution zone
   - **Network tab** → simulate network degradation per vehicle or globally
5. Watch vehicles react:
   - Their status chips update (Normal → Degraded Speed → Safe Stop)
   - The **Vehicle Panel** (click a vehicle) shows reason codes and affecting constraints
   - The **Event Timeline** (bottom) shows the full operator → backend → Sentinel decision loop
6. Clear active constraints from the **Active** tab → vehicles return to NORMAL

## Project Structure

```
sentinel/
├── Makefile              # Top-level dev commands
├── README.md
├── backend/              # Node.js/TypeScript — Sentinel Manager
│   └── src/
│       ├── domains/      # Events, Vehicles, Timeline
│       ├── ws/           # WebSocket connection managers
│       └── broadcast/    # Fan-out broadcaster
├── frontend/             # React/Vite/Tailwind — Control Console
│   └── src/
│       ├── components/   # Map, Control, Vehicle, Timeline UI
│       ├── store/        # Zustand state management
│       └── api/          # HTTP + WebSocket clients
└── sentinel-mock/        # Python — Simulated vehicle
    └── sentinel/
        ├── transport/    # WebSocket client (reconnecting)
        ├── simulation/   # Position/route simulation
        ├── policy/       # Deterministic decision engine
        ├── models/       # Data models
        └── reporting/    # Status + event reporting
```

## Sentinel Decision Model

| State | Trigger |
|---|---|
| `NORMAL` | No active constraints |
| `DEGRADED_SPEED` | Weather LOW/MODERATE, fog, slow/caution geofence, network DEGRADED/UNSTABLE |
| `SAFE_STOP_RECOMMENDED` | Weather HIGH/EXTREME, forbidden geofence, network LOST |
| `REROUTE_RECOMMENDED` | (future: route blockage) |

Multiple simultaneous factors add `MULTI_FACTOR_RISK` to reason codes.
```

- [ ] **Step 3: Commit**

```bash
cd sentinel
git add .
git commit -m "feat: Makefile and README with full setup and run instructions"
```

---

## Task 18: Integration and Final Wiring

This task ensures all the pieces connect end-to-end and fixes any remaining wiring issues.

- [ ] **Step 1: Create sentinel-mock tests directory and __init__**

```bash
mkdir -p sentinel/sentinel-mock/tests
touch sentinel/sentinel-mock/tests/__init__.py
```

- [ ] **Step 2: Verify backend starts cleanly**

```bash
cd sentinel/backend && npm run dev
```

Expected: `Sentinel Manager running on port 3001`  
Hit `Ctrl+C` after verifying.

- [ ] **Step 3: Verify frontend builds without TS errors**

```bash
cd sentinel/frontend && npm run build
```

Expected: Vite build completes without TypeScript errors.

- [ ] **Step 4: Verify mock runs with --help**

```bash
cd sentinel/sentinel-mock
source .venv/bin/activate
python -m sentinel.main --help
```

Expected: Argument help text printed.

- [ ] **Step 5: Run full integration smoke test**

Terminal 1:
```bash
cd sentinel && make backend
```

Terminal 2:
```bash
cd sentinel && make frontend
```

Terminal 3:
```bash
cd sentinel && make mock VEHICLE_ID=vehicle-001
```

Open http://localhost:5173.

Verify:
- Vehicle appears on the map
- Click vehicle → right panel shows vehicle ID and NORMAL status

Terminal 4:
```bash
cd sentinel && make mock VEHICLE_ID=vehicle-002 START_LAT=37.7849 START_LNG=-122.4094
```

Verify:
- Second vehicle appears on map

In the UI, publish a Weather event (HEAVY_RAIN, HIGH).

Verify:
- Both vehicle status chips change from Normal → Safe Stop
- Timeline shows: Operator Action → Event Published → Sentinel Receipt → Decision Changed → Status Update
- Vehicle panel reason codes show `WEATHER_HEAVY_RAIN`

Clear the event from the Active tab.

Verify:
- Vehicles return to NORMAL
- Timeline shows the clear event

- [ ] **Step 6: Run all tests**

```bash
cd sentinel && make test
```

Expected: Backend Vitest tests PASS, Python decision engine tests PASS.

- [ ] **Step 7: Final commit**

```bash
cd sentinel
git add .
git commit -m "feat: complete Sentinel MVP — full end-to-end integration verified"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task(s) |
|---|---|
| Map canvas with vehicles | Task 14 (VehicleMarker, MapCanvas) |
| Vehicle positions + headings | Task 9 (simulation), Task 14 (VehicleMarker) |
| Geofence polygons on map | Task 14 (GeofenceLayer) |
| Draw geofence from UI | Task 14 (GeofenceDrawer), Task 15 (GeofenceForm) |
| Publish weather event | Task 15 (WeatherForm) |
| Publish geofence event | Task 15 (GeofenceForm) |
| Publish network event | Task 15 (NetworkForm) |
| Clear active events | Task 15 (ActiveConstraints) |
| Vehicle panel with decision + reasons | Task 16 (VehiclePanel, DecisionBadge, ConstraintList) |
| Event timeline / audit feed | Task 16 (EventTimeline, TimelineItem) |
| Sentinel mock connects via WS | Task 8 (ws_client), Task 11 (main.py) |
| Sentinel receives constraints | Task 8 (SentinelClientManager), Task 11 (reporter.py) |
| Sentinel decision engine | Task 10 (decision_engine.py) |
| Sentinel reports status back | Task 11 (reporter.py) |
| Multi-vehicle support | Tasks 7, 13 (stores/WS fan-out), Task 14 |
| NORMAL / DEGRADED / SAFE_STOP decisions | Task 10 |
| WEATHER / GEOFENCE / NETWORK reason codes | Tasks 2, 10 |
| Backend validates events (Zod) | Tasks 2, 6 |
| Timeline tracks operator → backend → sentinel loop | Tasks 5, 7, 11 |
| Makefile with all targets | Task 17 |
| Python venv setup | Tasks 8, 17 |
| README with setup instructions | Task 17 |
| Premium Tailwind design | Tasks 12, 15, 16 |
| Live WS updates | Tasks 7, 13 |

### Type Consistency Check

- `VehicleStatus.vehicleId` used consistently (not `id` or `vehicle_id`) ✓
- `DecisionState` literal union used in both TS and Python models ✓
- `ReasonCode` values identical in `reason_codes.py` and `types/index.ts` ✓
- `SentinelMessage.type` literals: `'REGISTER' | 'STATUS_UPDATE' | 'EVENT_REPORT'` consistent ✓
- `ServerMessage.type` literals in `types/index.ts` match what `broadcaster.ts` sends ✓
- `ActiveEvent` shape identical in backend model and frontend types ✓
- `TimelineEntry.category` literals consistent across backend and frontend ✓

### Placeholder Scan — None found ✓
