import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, Html, Line, Points, PointMaterial } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { ActiveEvent, DecisionState, ReasonCode, WeatherPayload, GeofencePayload, NetworkPayload } from '../../types'

const DECISION_COLOR: Record<string, string> = {
  NORMAL: '#22d3ee',
  DEGRADED_SPEED: '#fbbf24',
  SAFE_STOP_RECOMMENDED: '#f87171',
  REROUTE_RECOMMENDED: '#fb923c',
}

const DECISION_SHORT: Record<string, string> = {
  NORMAL: 'NOMINAL',
  DEGRADED_SPEED: 'DEGRADED',
  SAFE_STOP_RECOMMENDED: 'STOP',
  REROUTE_RECOMMENDED: 'REROUTE',
}

const TYPE_COLOR: Record<string, string> = {
  WEATHER: '#fbbf24',
  GEOFENCE: '#f87171',
  NETWORK: '#fb923c',
}

function getNodePosition(index: number, total: number): [number, number, number] {
  const phi = Math.acos(1 - 2 * (index + 0.5) / Math.max(total, 1))
  const theta = Math.PI * (1 + Math.sqrt(5)) * index // golden angle
  const r = 1.6
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ]
}

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

interface DecisionCoreProps {
  decisionColor: string
  decision: DecisionState
  speedKmh: number
  activeConstraintsCount: number
}

function DecisionCore({ decisionColor, decision, speedKmh, activeConstraintsCount }: DecisionCoreProps) {
  const innerRef = useRef<THREE.Mesh>(null)
  const color = useMemo(() => new THREE.Color(decisionColor), [decisionColor])

  useFrame(({ clock }) => {
    if (innerRef.current) {
      const t = clock.getElapsedTime()
      const mat = innerRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * (1 + activeConstraintsCount * 0.3))
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Outer wireframe shell */}
      <Sphere args={[0.6, 32, 32]}>
        <meshStandardMaterial
          color={decisionColor}
          wireframe
          transparent
          opacity={0.15}
        />
      </Sphere>

      {/* Inner glowing core */}
      <Sphere args={[0.35, 24, 24]} ref={innerRef}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          metalness={0.3}
          roughness={0.4}
        />
      </Sphere>

      {/* Core glow */}
      <pointLight color={decisionColor} intensity={1.5} distance={3} />

      {/* HTML label */}
      <Html center distanceFactor={8}>
        <div style={{ userSelect: 'none', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{
            color: decisionColor,
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            textShadow: `0 0 8px ${decisionColor}`,
          }}>
            {DECISION_SHORT[decision] ?? decision}
          </div>
          <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '8px' }}>
            {speedKmh.toFixed(0)} km/h
          </div>
        </div>
      </Html>
    </group>
  )
}

// ─── Constraint Node ──────────────────────────────────────────────────────────

interface ConstraintNodeProps {
  constraint: ActiveEvent
  index: number
  total: number
}

function ConstraintNode({ constraint, index, total }: ConstraintNodeProps) {
  const typeColor = TYPE_COLOR[constraint.type] ?? '#a78bfa'
  const nodePos = getNodePosition(index, total)

  return (
    <group>
      {/* Glowing sphere */}
      <Sphere args={[0.12, 12, 12]} position={nodePos}>
        <meshStandardMaterial
          color={typeColor}
          emissive={typeColor}
          emissiveIntensity={1.2}
          metalness={0.5}
        />
      </Sphere>

      {/* Beam from node → core */}
      <Line
        points={[nodePos, [0, 0, 0]]}
        color={typeColor}
        lineWidth={1.5}
        transparent
        opacity={0.6}
      />

      {/* HTML label */}
      <Html position={nodePos} center distanceFactor={8}>
        <div style={{
          userSelect: 'none',
          pointerEvents: 'none',
          background: 'rgba(6,8,15,0.85)',
          border: `1px solid ${typeColor}40`,
          borderRadius: '6px',
          padding: '4px 8px',
          maxWidth: '120px',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            color: typeColor,
            fontFamily: 'monospace',
            fontSize: '9px',
            fontWeight: 'bold',
            marginBottom: '2px',
          }}>
            {constraint.type}
          </div>
          <div style={{
            color: '#cbd5e1',
            fontFamily: 'monospace',
            fontSize: '8px',
            lineHeight: '1.3',
          }}>
            {getConstraintSummary(constraint)}
          </div>
        </div>
      </Html>
    </group>
  )
}

// ─── Idle Particle Cloud ──────────────────────────────────────────────────────

function IdleParticleCloud() {
  const pointsRef = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const count = 120
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
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
    if (pointsRef.current) {
      const t = clock.getElapsedTime()
      pointsRef.current.rotation.y = t * 0.08
      pointsRef.current.rotation.x = t * 0.03
    }
  })

  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial
        color="#94a3b8"
        size={0.018}
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </Points>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────

interface SceneProps {
  decision: DecisionState
  speedKmh: number
  activeConstraints: ActiveEvent[]
}

function Scene({ decision, speedKmh, activeConstraints }: SceneProps) {
  const decisionColor = DECISION_COLOR[decision] ?? '#22d3ee'

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[2, 2, 2]} color={decisionColor} intensity={0.8} />
      <pointLight position={[-2, -1, -2]} color="#ffffff" intensity={0.4} />

      <DecisionCore
        decisionColor={decisionColor}
        decision={decision}
        speedKmh={speedKmh}
        activeConstraintsCount={activeConstraints.length}
      />

      {activeConstraints.length === 0 ? (
        <IdleParticleCloud />
      ) : (
        activeConstraints.map((constraint, i) => (
          <ConstraintNode
            key={constraint.id}
            constraint={constraint}
            index={i}
            total={activeConstraints.length}
          />
        ))
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
}

export default function BrainCanvas({ decision, speedKmh, activeConstraints }: BrainCanvasProps) {
  return (
    <Canvas
      style={{ height: '260px', background: 'transparent', userSelect: 'none' }}
      camera={{ position: [0, 1.5, 4], fov: 50 }}
      gl={{ alpha: true, antialias: true }}
    >
      <OrbitControls autoRotate autoRotateSpeed={0.4} enableZoom={false} enablePan={false} />
      <Scene
        decision={decision}
        speedKmh={speedKmh}
        activeConstraints={activeConstraints}
      />
    </Canvas>
  )
}
