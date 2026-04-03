import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Trail, Points, PointMaterial } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { ActiveEvent, DecisionState, ReasonCode, WeatherPayload, GeofencePayload, NetworkPayload } from '../../types'
import type { BrainCanvasProps } from './BrainCanvas'

// ─── Color maps ───────────────────────────────────────────────────────────────

const DECISION_COLOR: Record<string, string> = {
  NORMAL: '#22d3ee',
  DEGRADED_SPEED: '#fbbf24',
  SAFE_STOP_RECOMMENDED: '#f87171',
  REROUTE_RECOMMENDED: '#fb923c',
}

const TYPE_COLOR: Record<string, string> = {
  WEATHER: '#fbbf24',
  GEOFENCE: '#f87171',
  NETWORK: '#fb923c',
}

const REASON_CODE_COLOR: Record<string, string> = {
  NETWORK_POOR: '#fb923c',
  NETWORK_LOST: '#fb923c',
  PERCEPTION_ALARM: '#a78bfa',
  SENSOR_OBSTACLE_DETECTED: '#f87171',
  SENSOR_FAULT: '#f87171',
  MULTI_FACTOR_RISK: '#a78bfa',
}

const REASON_CODE_GROUP: Record<string, string> = {
  NETWORK_POOR: 'NETWORK_INT',
  NETWORK_LOST: 'NETWORK_INT',
  PERCEPTION_ALARM: 'INTERNAL',
  SENSOR_OBSTACLE_DETECTED: 'SENSOR',
  SENSOR_FAULT: 'SENSOR',
  MULTI_FACTOR_RISK: 'INTERNAL',
}

// Spirograph harmonic ratios — each creates a unique non-circular path
const HARMONICS = [1.618, 2.0, 1.5, 0.667, 2.5, 0.75, 3.0, 1.333]

function getConstraintSummary(event: ActiveEvent): string {
  if (event.type === 'WEATHER') {
    const p = event.payload as WeatherPayload
    return `${p.condition.replace(/_/g, ' ')} · ${p.severity}`
  }
  if (event.type === 'GEOFENCE') {
    const p = event.payload as GeofencePayload
    return `${p.type} zone${p.label ? ` · ${p.label}` : ''}`
  }
  if (event.type === 'NETWORK') {
    const p = event.payload as NetworkPayload
    return `Signal ${p.severity}${p.vehicleId ? ' (targeted)' : ''}`
  }
  return event.type
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function hashId(id: string): number {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) & 0x7fffffff
  return h
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

// ─── Hover types ──────────────────────────────────────────────────────────────

interface HoverInfo { id: string; type: string; label: string; color: string }

// ─── Atom Nucleus ─────────────────────────────────────────────────────────────

function AtomNucleus({ decisionColor, affectingCount, isPaused }: { decisionColor: string; affectingCount: number; isPaused: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const smoothRef = useRef(Math.min(affectingCount / 8, 1))
  const color = useMemo(() => new THREE.Color(decisionColor), [decisionColor])

  useFrame(({ clock }) => {
    if (isPaused || !meshRef.current) return
    const target = Math.min(affectingCount / 8, 1)
    smoothRef.current += (target - smoothRef.current) * 0.03
    const s = smoothRef.current
    const t = clock.getElapsedTime()
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    // Subtle pulse — reduced amplitude
    mat.emissiveIntensity = 0.72 + 0.12 * Math.sin(t * (1.0 + s * 1.2))
    if (s > 0.4) {
      meshRef.current.scale.setScalar(1 + 0.02 * s * Math.sin(t * 2.5))
    }
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.72} metalness={0.4} roughness={0.3} />
      </mesh>
      <pointLight color={decisionColor} intensity={1.3} distance={4} />
    </group>
  )
}

// ─── Electron Orbit ───────────────────────────────────────────────────────────

interface ElectronOrbitProps {
  nodeId: string
  color: string
  targetStability: number
  affecting: boolean
  isPaused: boolean
  onHover: (info: HoverInfo | null) => void
  hoverInfo: HoverInfo
}

function ElectronOrbit({ nodeId, color, targetStability, affecting, isPaused, onHover, hoverInfo }: ElectronOrbitProps) {
  const groupRef    = useRef<THREE.Group>(null)
  const electronRef = useRef<THREE.Mesh>(null)
  const elecMatRef  = useRef<THREE.MeshStandardMaterial>(null)
  // Frozen time: advances only when not paused — ensures smooth resume with no position jump
  const frozenT     = useRef(0)
  const lastReal    = useRef(-1)
  const birthT      = useRef(-1)
  const smoothStab  = useRef(targetStability)

  const h = useMemo(() => hashId(nodeId), [nodeId])
  const orbitRadius = 1.2 + (h % 100) / 250             // 1.20 – 1.60
  const speed       = 0.4 + (h % 80) / 100              // 0.40 – 1.20
  const phase       = (h % 628) / 100                   // 0 – 2π
  const baseRx      = ((h % 314) / 100) - Math.PI / 2
  const baseRy      = ((h >> 4 & 0xff) / 255) * Math.PI
  const driftX      = ((h >> 8  & 0xff) / 255 - 0.5) * 0.4
  const driftZ      = ((h >> 16 & 0xff) / 255 - 0.5) * 0.4
  const harmonic    = HARMONICS[h % HARMONICS.length]
  // Spirograph radii
  const R1 = orbitRadius * 0.72   // primary orbit radius
  const R2 = orbitRadius * 0.30   // epicycle radius

  const colorObj = useMemo(() => new THREE.Color(color), [color])

  const trailWidth  = affecting ? 0.04 : 0.01
  const trailLength = affecting ? 16   : 6
  const elecOpacity = affecting ? 1.0  : 0.15
  const elecEmit    = affecting ? 1.4  : 0.2
  const elecR       = affecting ? 0.08 : 0.04

  useFrame(({ clock }) => {
    const real = clock.getElapsedTime()
    // Accumulate frozen time only when not paused
    if (lastReal.current >= 0) {
      if (!isPaused) frozenT.current += real - lastReal.current
    } else {
      // First frame: initialise frozen time and birth time
      frozenT.current = real
      birthT.current  = real
    }
    lastReal.current = real

    const t = frozenT.current
    const age = t - birthT.current
    const entry = easeOutCubic(Math.min(age / 0.5, 1))

    smoothStab.current += (targetStability - smoothStab.current) * 0.03
    const stab = smoothStab.current

    if (groupRef.current) {
      groupRef.current.scale.setScalar(entry)
      const drift = stab * t * 0.15
      groupRef.current.rotation.x = baseRx + driftX * drift
      groupRef.current.rotation.y = baseRy + driftZ * drift * 0.7
      groupRef.current.rotation.z = driftZ * drift * 0.4
    }

    // Spirograph position: two angular frequencies combined
    if (electronRef.current) {
      const a1 = t * speed + phase
      const a2 = t * speed * harmonic + phase * 1.7
      const ex = R1 * Math.cos(a1) + R2 * Math.cos(a2)
      const ey = R1 * Math.sin(a1) + R2 * Math.sin(a2)
      const ez = R2 * Math.sin(a2 * 0.7 + 0.8) * 0.5  // small out-of-plane wobble
      electronRef.current.position.set(ex, ey, ez)
    }

    if (elecMatRef.current) {
      elecMatRef.current.opacity = entry * elecOpacity
      elecMatRef.current.emissiveIntensity = entry * elecEmit
    }
  })

  return (
    <group ref={groupRef}>
      <Trail
        width={trailWidth}
        length={trailLength}
        color={color}
        attenuation={(t) => t * t}
        decay={1}
      >
        <mesh
          ref={electronRef}
          onPointerOver={(e) => { e.stopPropagation(); onHover(hoverInfo) }}
          onPointerOut={() => onHover(null)}
        >
          <sphereGeometry args={[elecR, 10, 10]} />
          <meshStandardMaterial
            ref={elecMatRef}
            color={colorObj}
            emissive={colorObj}
            emissiveIntensity={elecEmit}
            transparent
            opacity={elecOpacity}
          />
        </mesh>
      </Trail>
    </group>
  )
}

// ─── Ambient Stars (always present) ──────────────────────────────────────────

function AmbientStars({ isPaused }: { isPaused: boolean }) {
  const pointsRef = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const pos = new Float32Array(120 * 3)
    for (let i = 0; i < 120; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 2.2
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])
  useFrame(({ clock }) => {
    if (isPaused || !pointsRef.current) return
    const t = clock.getElapsedTime()
    pointsRef.current.rotation.y = t * 0.04
    pointsRef.current.rotation.x = t * 0.015
  })
  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial color="#94a3b8" size={0.014} transparent opacity={0.25} sizeAttenuation />
    </Points>
  )
}

// ─── Atom Scene ───────────────────────────────────────────────────────────────

interface AtomNode { id: string; color: string; affecting: boolean; hoverInfo: HoverInfo }

interface AtomSceneProps {
  decision: DecisionState
  activeConstraints: ActiveEvent[]
  affectingIds: Set<string>
  reasonCodes: ReasonCode[]
  isPaused: boolean
  onHover: (info: HoverInfo | null) => void
}

function AtomScene({ decision, activeConstraints, affectingIds, reasonCodes, isPaused, onHover }: AtomSceneProps) {
  const decisionColor = DECISION_COLOR[decision] ?? '#22d3ee'

  const syntheticNodes = useMemo(() =>
    reasonCodes.filter((code) => {
      if (code.startsWith('WEATHER_') || code.startsWith('GEOFENCE_') ||
          code === 'IN_GEOFENCE_FORBIDDEN_ZONE' || code === 'IN_GEOFENCE_CAUTION_ZONE' ||
          code === 'IN_GEOFENCE_SLOW_ZONE' || code === 'GEOFENCE_AHEAD') return false
      return REASON_CODE_COLOR[code] !== undefined
    }),
  [reasonCodes])

  const nodes = useMemo<AtomNode[]>(() => [
    ...activeConstraints.map((c) => ({
      id: c.id,
      color: TYPE_COLOR[c.type] ?? '#a78bfa',
      affecting: affectingIds.has(c.id),
      hoverInfo: { id: c.id, type: c.type, label: getConstraintSummary(c), color: TYPE_COLOR[c.type] ?? '#a78bfa' },
    })),
    ...syntheticNodes.map((code) => ({
      id: code,
      color: REASON_CODE_COLOR[code],
      affecting: true,
      hoverInfo: { id: code, type: REASON_CODE_GROUP[code] ?? 'INTERNAL', label: code.replace(/_/g, ' '), color: REASON_CODE_COLOR[code] },
    })),
  ], [activeConstraints, affectingIds, syntheticNodes])

  const affectingCount = nodes.filter(n => n.affecting).length
  const targetStability = Math.min(affectingCount / 8, 1)

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[2, 2, 2]} color={decisionColor} intensity={0.8} />
      <pointLight position={[-2, -1, -2]} color="#ffffff" intensity={0.4} />

      <AmbientStars isPaused={isPaused} />
      <AtomNucleus decisionColor={decisionColor} affectingCount={affectingCount} isPaused={isPaused} />

      {nodes.map((node) => (
        <ElectronOrbit
          key={node.id}
          nodeId={node.id}
          color={node.color}
          targetStability={targetStability}
          affecting={node.affecting}
          isPaused={isPaused}
          onHover={onHover}
          hoverInfo={node.hoverInfo}
        />
      ))}

      <EffectComposer>
        <Bloom luminanceThreshold={0.15} intensity={1.2} mipmapBlur />
      </EffectComposer>
    </>
  )
}

// ─── AtomCanvas (public export) ───────────────────────────────────────────────

export default function AtomCanvas({ decision, reasonCodes, speedKmh, activeConstraints, affectingConstraintIds = [], fullscreen, autoRotate = true }: BrainCanvasProps) {
  const [hovered, setHovered] = useState<HoverInfo | null>(null)
  const orbitRef = useRef<OrbitControlsImpl>(null)
  const affectingIds = useMemo(() => new Set(affectingConstraintIds), [affectingConstraintIds])
  const isPaused = !!hovered

  useEffect(() => {
    if (!hovered) return
    const allIds = new Set([
      ...activeConstraints.map(c => c.id),
      ...reasonCodes.filter(code => {
        if (code.startsWith('WEATHER_') || code.startsWith('GEOFENCE_') ||
            code === 'IN_GEOFENCE_FORBIDDEN_ZONE' || code === 'IN_GEOFENCE_CAUTION_ZONE' ||
            code === 'IN_GEOFENCE_SLOW_ZONE' || code === 'GEOFENCE_AHEAD') return false
        return true
      })
    ])
    if (!allIds.has(hovered.id)) setHovered(null)
  }, [activeConstraints, reasonCodes, hovered])

  return (
    <div style={{ position: 'relative', height: fullscreen ? '100vh' : '260px', userSelect: 'none' }}>
      <Canvas
        style={{ height: '100%', background: 'transparent', userSelect: 'none' }}
        camera={{ position: [0, 1.5, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        <OrbitControls
          ref={orbitRef as any}
          autoRotate={autoRotate && !isPaused}
          autoRotateSpeed={0.3}
          enableZoom
          minDistance={2}
          maxDistance={8}
          enablePan={false}
        />
        <AtomScene
          decision={decision}
          activeConstraints={activeConstraints}
          affectingIds={affectingIds}
          reasonCodes={reasonCodes}
          isPaused={isPaused}
          onHover={setHovered}
        />
      </Canvas>

      <button
        onClick={() => { (orbitRef.current as any)?.reset() }}
        style={{
          position: 'absolute', top: 8, ...(fullscreen ? { left: 8 } : { right: 8 }), zIndex: 10,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
          color: '#64748b', fontFamily: 'monospace', fontSize: '9px',
        }}
        onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = '#94a3b8' }}
        onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = '#64748b' }}
        title="Reset view"
      >
        ⟲ RESET
      </button>

      <div style={{ position: 'absolute', bottom: hovered ? 56 : 8, left: 8, zIndex: 10, color: '#334155', fontFamily: 'monospace', fontSize: '8px', pointerEvents: 'none', transition: 'bottom 0.2s' }}>
        scroll to zoom · drag to rotate
      </div>

      {hovered && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(7,6,15,0.92)', border: `1px solid ${hovered.color}40`,
          borderRadius: 8, padding: '6px 12px', pointerEvents: 'none', zIndex: 10,
          backdropFilter: 'blur(8px)', whiteSpace: 'nowrap', boxShadow: `0 0 12px ${hovered.color}30`,
        }}>
          <div style={{ color: hovered.color, fontFamily: 'monospace', fontSize: '10px', fontWeight: 'bold', marginBottom: 2 }}>{hovered.type}</div>
          <div style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '9px' }}>{hovered.label}</div>
        </div>
      )}
    </div>
  )
}
