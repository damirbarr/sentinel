# Atom Visualization — Design Spec
**Date:** 2026-04-03  
**Status:** Approved

## Overview

Add a second 3D cognition visualization — an atom — alongside the existing brain. Both visualizations share the same data interface. A settings toggle switches between them. Both gain smooth animated entry/exit for nodes/electrons.

## Architecture

### New file
`frontend/src/components/vehicle/AtomCanvas.tsx` — R3F scene, same props as `BrainCanvas`:
```ts
interface VizProps {
  decision: DecisionState
  reasonCodes: ReasonCode[]
  speedKmh: number
  activeConstraints: ActiveEvent[]
  fullscreen?: boolean
  autoRotate?: boolean
}
```

### Store change
Add to `ui.store.ts`:
```ts
settingVizMode: 'brain' | 'atom'   // default: 'brain'
setSettingVizMode: (v: 'brain' | 'atom') => void
```

### Settings UI
`SettingsModal.tsx` — new "Visualization" row with two pill buttons: **Brain** / **Atom**. Selecting one writes `settingVizMode` immediately.

### VehicleProfile integration
```tsx
{settingVizMode === 'atom'
  ? <AtomCanvas {...vizProps} />
  : <BrainCanvas {...vizProps} />}
```
No transition between viz modes — instant swap.

## AtomCanvas Scene

### Nucleus
- `SphereGeometry` radius 0.28, `meshStandardMaterial` with emissive = decision color
- Pulse: `emissiveIntensity = 0.8 + 0.5 * sin(t * (1.5 + n * 0.4))` where `n` = electron count
- At high load (n ≥ 6): scale oscillates ±3% via `sin(t * 3)`
- Point light at origin, color = decision color, intensity scales with n

### Electron/Orbit Nodes
One per constraint + one per internal reason code (same source data as BrainCanvas nodes).

**Orbit ring:**
- `TorusGeometry(r, 0.012, 8, 64)` where `r` is deterministically varied per node (1.2–1.6 range)
- Initial inclination: `{rotation: [seed_x * π, seed_y * π, 0]}` where seeds are derived from node id hash
- At load, rings drift toward increasingly random target inclinations. `stabilityFactor = clamp(n / 8, 0, 1)` controls drift magnitude. Interpolated each frame: `currentAngle = lerp(currentAngle, targetAngle, 0.02)`
- Color = type color (WEATHER=#fbbf24, GEOFENCE=#f87171, NETWORK=#fb923c, internal=#a78bfa), opacity ~0.35

**Electron sphere:**
- `SphereGeometry(0.07, 10, 10)`, `meshStandardMaterial` emissive = same type color, emissiveIntensity=1.4
- Orbits ring using phase: `x = r*cos(t*speed + phase)`, `z = r*sin(t*speed + phase)` in ring local space
- `speed` and `phase` deterministically seeded from node id — stable across re-renders

**Idle state (n=0):**
- Same 120-particle cloud as BrainCanvas, same color/opacity
- Nucleus pulses gently at base rate

### Instability metric
`stabilityFactor = clamp(n / 8, 0, 1)`

| Factor | 0 (stable) | 0.5 | 1.0 (chaotic) |
|--------|-----------|-----|---------------|
| Ring drift magnitude | near-zero | moderate tilt | full random |
| Nucleus pulse speed | 1.5× | 2.5× | 4× |
| Nucleus scale oscillation | none | ±1% | ±3% |

### Post-processing
Reuses same `EffectComposer` + `Bloom` setup as BrainCanvas (luminanceThreshold=0.15, intensity=1.2, mipmapBlur).

### Lighting
- Ambient: intensity=0.2
- Dynamic point light at [0,0,0]: decision color, intensity = 1.2 + 0.6*stabilityFactor
- Fixed fill light at [-2,-1,-2]: white, intensity=0.4

## Smooth Node Entry/Exit (both BrainCanvas and AtomCanvas)

### Strategy
Each viz component maintains two refs:
- `birthTimes: Map<nodeId, timestamp>` — set when node first appears
- `exitTimes: Map<nodeId, timestamp>` — set when node is removed, keep for 300ms

In `useFrame`, per node:
- **Enter:** `age = clock.elapsedTime - birthTime`. Scale and opacity interpolate 0→1 over 500ms: `progress = clamp(age / 0.5, 0, 1)`. Apply easeOutCubic.
- **Exit:** `age = clock.elapsedTime - exitTime`. Scale/opacity go 1→0 over 300ms. After 300ms remove from departing set.

Node id set is diffed each frame against previous to detect arrivals/departures.

### BrainCanvas changes
Apply same birth/exit ref pattern to existing constraint nodes and reason-code nodes. The geometry/color logic is unchanged — only scale and opacity are driven by the animation progress.

## Settings

```
┌─ Visualization ──────────────────────────────────┐
│  [ Brain ]  [ Atom ]                             │
└──────────────────────────────────────────────────┘
```
Active pill: white bg, dark text. Inactive: transparent, slate text.

## Out of Scope
- Transition animation between Brain and Atom modes
- Persistence of viz mode across sessions
- Per-electron tooltips (atom uses same hover system as brain for constraint info)
