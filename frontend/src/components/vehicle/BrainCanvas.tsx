import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, Line, Points, PointMaterial } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { ActiveEvent, DecisionState, ReasonCode, WeatherPayload, GeofencePayload, NetworkPayload } from '../../types'
import WeatherParticles from './WeatherParticles'

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

// ─── Utilities ────────────────────────────────────────────────────────────────

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

function hashId(id: string): number {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) & 0x7fffffff
  return h
}

// Stable position on sphere derived from id — never shifts when count changes
function getStablePosition(id: string): [number, number, number] {
  const h = hashId(id)
  const phi = Math.acos(1 - 2 * ((h % 997 + 0.5) / 997))
  const theta = ((h >> 10) % 997) / 997 * Math.PI * 2
  const r = 1.6
  return [r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)]
}

// ─── Hover types ──────────────────────────────────────────────────────────────

interface ReasonCodeHover { id: string; type: string; label: string }
type HoveredNode = ActiveEvent | ReasonCodeHover
function isReasonCodeHover(h: HoveredNode): h is ReasonCodeHover { return 'label' in h }

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

// ─── Decision Core ────────────────────────────────────────────────────────────

function DecisionCore({ decisionColor, affectingCount, isPaused }: { decisionColor: string; affectingCount: number; isPaused: boolean }) {
  const innerRef = useRef<THREE.Mesh>(null)
  const color = useMemo(() => new THREE.Color(decisionColor), [decisionColor])

  useFrame(({ clock }) => {
    if (isPaused || !innerRef.current) return
    const t = clock.getElapsedTime()
    const mat = innerRef.current.material as THREE.MeshStandardMaterial
    // Subtle pulse — reduced amplitude
    mat.emissiveIntensity = 0.55 + 0.1 * Math.sin(t * (1 + affectingCount * 0.25))
  })

  return (
    <group>
      <Sphere args={[0.6, 32, 32]}>
        <meshStandardMaterial color={decisionColor} wireframe transparent opacity={0.15} />
      </Sphere>
      <Sphere args={[0.35, 24, 24]} ref={innerRef}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} metalness={0.3} roughness={0.4} />
      </Sphere>
      <pointLight color={decisionColor} intensity={1.5} distance={3} />
    </group>
  )
}

// ─── Constraint Node ──────────────────────────────────────────────────────────

interface ConstraintNodeProps {
  constraint: ActiveEvent
  affecting: boolean
  isPaused: boolean
  onHover: (c: ActiveEvent | null) => void
}

function ConstraintNode({ constraint, affecting, isPaused, onHover }: ConstraintNodeProps) {
  const typeColor = TYPE_COLOR[constraint.type] ?? '#a78bfa'
  const nodePos = getStablePosition(constraint.id)
  const groupRef = useRef<THREE.Group>(null)
  const birthRef = useRef(-1)

  useFrame(({ clock }) => {
    if (isPaused) return
    if (birthRef.current < 0) birthRef.current = clock.getElapsedTime()
    const progress = easeOutCubic(Math.min((clock.getElapsedTime() - birthRef.current) / 0.5, 1))
    groupRef.current?.scale.setScalar(progress)
  })

  return (
    <group ref={groupRef}>
      <Sphere
        args={affecting ? [0.12, 12, 12] : [0.06, 8, 8]}
        position={nodePos}
        onPointerOver={(e) => { e.stopPropagation(); onHover(constraint) }}
        onPointerOut={() => onHover(null)}
      >
        <meshStandardMaterial
          color={typeColor}
          emissive={typeColor}
          emissiveIntensity={affecting ? 1.2 : 0.15}
          metalness={affecting ? 0.5 : 0.2}
          transparent={!affecting}
          opacity={affecting ? 1 : 0.35}
        />
      </Sphere>
      <Line
        points={[nodePos, [0, 0, 0]]}
        color={typeColor}
        lineWidth={affecting ? 1.5 : 0.5}
        transparent
        opacity={affecting ? 0.6 : 0.08}
      />
    </group>
  )
}

// ─── Reason Code Node (always affecting) ─────────────────────────────────────

interface ReasonCodeNodeProps {
  code: string
  color: string
  isPaused: boolean
  onHover: (h: ReasonCodeHover | null) => void
}

function ReasonCodeNode({ code, color, isPaused, onHover }: ReasonCodeNodeProps) {
  const nodePos = getStablePosition(code)
  const group = REASON_CODE_GROUP[code] ?? 'INTERNAL'
  const groupRef = useRef<THREE.Group>(null)
  const birthRef = useRef(-1)

  useFrame(({ clock }) => {
    if (isPaused) return
    if (birthRef.current < 0) birthRef.current = clock.getElapsedTime()
    const progress = easeOutCubic(Math.min((clock.getElapsedTime() - birthRef.current) / 0.5, 1))
    groupRef.current?.scale.setScalar(progress)
  })

  return (
    <group ref={groupRef}>
      <Sphere
        args={[0.12, 12, 12]}
        position={nodePos}
        onPointerOver={(e) => { e.stopPropagation(); onHover({ id: code, type: group, label: code.replace(/_/g, ' ') }) }}
        onPointerOut={() => onHover(null)}
      >
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} metalness={0.5} />
      </Sphere>
      <Line points={[nodePos, [0, 0, 0]]} color={color} lineWidth={1.5} transparent opacity={0.6} />
    </group>
  )
}

// ─── Idle Particle Cloud ──────────────────────────────────────────────────────

function IdleParticleCloud({ isPaused }: { isPaused: boolean }) {
  const pointsRef = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const pos = new Float32Array(120 * 3)
    for (let i = 0; i < 120; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1.8
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])
  useFrame(({ clock }) => {
    if (isPaused || !pointsRef.current) return
    const t = clock.getElapsedTime()
    pointsRef.current.rotation.y = t * 0.08
    pointsRef.current.rotation.x = t * 0.03
  })
  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial color="#94a3b8" size={0.018} transparent opacity={0.5} sizeAttenuation />
    </Points>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────

interface SceneProps {
  decision: DecisionState
  activeConstraints: ActiveEvent[]
  affectingIds: Set<string>
  reasonCodes: ReasonCode[]
  isPaused: boolean
  onHoverConstraint: (c: HoveredNode | null) => void
}

function Scene({ decision, activeConstraints, affectingIds, reasonCodes, isPaused, onHoverConstraint }: SceneProps) {
  const decisionColor = DECISION_COLOR[decision] ?? '#22d3ee'

  const syntheticNodes = useMemo(() =>
    reasonCodes.filter((code) => {
      if (code.startsWith('WEATHER_') || code.startsWith('GEOFENCE_') ||
          code === 'IN_GEOFENCE_FORBIDDEN_ZONE' || code === 'IN_GEOFENCE_CAUTION_ZONE' ||
          code === 'IN_GEOFENCE_SLOW_ZONE' || code === 'GEOFENCE_AHEAD') return false
      return REASON_CODE_COLOR[code] !== undefined
    }),
  [reasonCodes])

  const affectingCount = activeConstraints.filter(c => affectingIds.has(c.id)).length + syntheticNodes.length
  const totalNodes = activeConstraints.length + syntheticNodes.length

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[2, 2, 2]} color={decisionColor} intensity={0.8} />
      <pointLight position={[-2, -1, -2]} color="#ffffff" intensity={0.4} />

      <DecisionCore decisionColor={decisionColor} affectingCount={affectingCount} isPaused={isPaused} />

      {totalNodes === 0 ? (
        <IdleParticleCloud isPaused={isPaused} />
      ) : (
        <>
          {activeConstraints.map((constraint) => (
            <ConstraintNode
              key={constraint.id}
              constraint={constraint}
              affecting={affectingIds.has(constraint.id)}
              isPaused={isPaused}
              onHover={onHoverConstraint}
            />
          ))}
          {syntheticNodes.map((code) => (
            <ReasonCodeNode
              key={code}
              code={code}
              color={REASON_CODE_COLOR[code]}
              isPaused={isPaused}
              onHover={onHoverConstraint}
            />
          ))}
        </>
      )}

      <EffectComposer>
        <Bloom luminanceThreshold={0.15} intensity={1.2} mipmapBlur />
      </EffectComposer>
    </>
  )
}

// ─── BrainCanvas (public export) ─────────────────────────────────────────────

export interface BrainCanvasProps {
  decision: DecisionState
  reasonCodes: ReasonCode[]
  speedKmh: number
  activeConstraints: ActiveEvent[]
  affectingConstraintIds?: string[]
  fullscreen?: boolean
  autoRotate?: boolean
  weatherConditions?: string[]
}

export default function BrainCanvas({ decision, reasonCodes, speedKmh, activeConstraints, affectingConstraintIds = [], fullscreen, autoRotate = true, weatherConditions = [] }: BrainCanvasProps) {
  const [hoveredConstraint, setHoveredConstraint] = useState<HoveredNode | null>(null)
  const orbitRef = useRef<OrbitControlsImpl>(null)
  const affectingIds = useMemo(() => new Set(affectingConstraintIds), [affectingConstraintIds])
  const isPaused = !!hoveredConstraint

  useEffect(() => {
    if (!hoveredConstraint) return
    if (isReasonCodeHover(hoveredConstraint)) {
      if (!reasonCodes.includes(hoveredConstraint.id as ReasonCode)) setHoveredConstraint(null)
    } else {
      if (!activeConstraints.find(c => c.id === (hoveredConstraint as ActiveEvent).id)) setHoveredConstraint(null)
    }
  }, [activeConstraints, reasonCodes, hoveredConstraint])

  const hoveredColor = hoveredConstraint
    ? isReasonCodeHover(hoveredConstraint)
      ? REASON_CODE_COLOR[hoveredConstraint.id] ?? '#a78bfa'
      : TYPE_COLOR[(hoveredConstraint as ActiveEvent).type] ?? '#a78bfa'
    : '#a78bfa'

  return (
    <div style={{ position: 'relative', height: fullscreen ? '100vh' : '260px', userSelect: 'none' }}>
      <Canvas
        style={{ height: '100%', background: 'transparent', userSelect: 'none' }}
        camera={{ position: [0, 1.5, 4], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        <OrbitControls
          ref={orbitRef as any}
          autoRotate={autoRotate && !isPaused}
          autoRotateSpeed={0.4}
          enableZoom
          minDistance={2}
          maxDistance={7}
          enablePan={false}
        />
        <Scene
          decision={decision}
          activeConstraints={activeConstraints}
          affectingIds={affectingIds}
          reasonCodes={reasonCodes}
          isPaused={isPaused}
          onHoverConstraint={setHoveredConstraint}
        />
        <WeatherParticles conditions={weatherConditions} />
      </Canvas>

      <button
        onClick={() => { (orbitRef.current as any)?.reset() }}
        style={{
          position: 'absolute', top: 8, ...(fullscreen ? { left: 8 } : { right: 8 }), zIndex: 10,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
          color: '#64748b', fontFamily: 'monospace', fontSize: '9px', transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = '#94a3b8'; (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
        onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = '#64748b'; (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
        title="Reset view"
      >
        ⟲ RESET
      </button>

      <div style={{ position: 'absolute', bottom: hoveredConstraint ? 56 : 8, left: 8, zIndex: 10, color: '#334155', fontFamily: 'monospace', fontSize: '8px', pointerEvents: 'none', transition: 'bottom 0.2s' }}>
        scroll to zoom · drag to rotate
      </div>

      {hoveredConstraint && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(7,6,15,0.92)', border: `1px solid ${hoveredColor}40`,
          borderRadius: 8, padding: '6px 12px', pointerEvents: 'none', zIndex: 10,
          backdropFilter: 'blur(8px)', whiteSpace: 'nowrap', boxShadow: `0 0 12px ${hoveredColor}30`,
        }}>
          {isReasonCodeHover(hoveredConstraint) ? (
            <>
              <div style={{ color: hoveredColor, fontFamily: 'monospace', fontSize: '10px', fontWeight: 'bold', marginBottom: 2 }}>{hoveredConstraint.type}</div>
              <div style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '9px' }}>{hoveredConstraint.label}</div>
            </>
          ) : (
            <>
              <div style={{ color: hoveredColor, fontFamily: 'monospace', fontSize: '10px', fontWeight: 'bold', marginBottom: 2 }}>{(hoveredConstraint as ActiveEvent).type}</div>
              <div style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '9px' }}>{getConstraintSummary(hoveredConstraint as ActiveEvent)}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
