import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Points, PointMaterial } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { ActiveEvent, DecisionState, ReasonCode, WeatherPayload, GeofencePayload, NetworkPayload } from '../../types'
import type { BrainCanvasProps } from './BrainCanvas'

// ─── Shared color maps ────────────────────────────────────────────────────────

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

interface HoverInfo { type: string; label: string; color: string }

// ─── Atom Nucleus ─────────────────────────────────────────────────────────────

function AtomNucleus({ decisionColor, affectingCount }: { decisionColor: string; affectingCount: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const smoothRef = useRef(Math.min(affectingCount / 8, 1))
  const color = useMemo(() => new THREE.Color(decisionColor), [decisionColor])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    // Smooth stability transitions
    const target = Math.min(affectingCount / 8, 1)
    smoothRef.current += (target - smoothRef.current) * 0.03
    const s = smoothRef.current
    const t = clock.getElapsedTime()
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.8 + 0.5 * Math.sin(t * (1.5 + s * 2.5))
    if (s > 0.4) {
      meshRef.current.scale.setScalar(1 + 0.03 * s * Math.sin(t * 3))
    }
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} metalness={0.4} roughness={0.3} />
      </mesh>
      <pointLight color={decisionColor} intensity={1.5} distance={4} />
    </group>
  )
}

// ─── Electron Orbit ───────────────────────────────────────────────────────────

interface ElectronOrbitProps {
  nodeId: string
  color: string
  targetStability: number   // 0–1, based on affecting count; smoothed internally
  affecting: boolean
  onHover: (info: HoverInfo | null) => void
  hoverInfo: HoverInfo
}

function ElectronOrbit({ nodeId, color, targetStability, affecting, onHover, hoverInfo }: ElectronOrbitProps) {
  const groupRef    = useRef<THREE.Group>(null)
  const electronRef = useRef<THREE.Mesh>(null)
  const ringMatRef  = useRef<THREE.MeshStandardMaterial>(null)
  const elecMatRef  = useRef<THREE.MeshStandardMaterial>(null)
  const birthRef    = useRef(-1)
  const smoothStab  = useRef(targetStability)

  // Deterministic per-orbit properties from id hash
  const h = useMemo(() => hashId(nodeId), [nodeId])
  const orbitRadius = 1.2 + (h % 100) / 250           // 1.20 – 1.60
  const speed       = 0.4 + (h % 80) / 100            // 0.40 – 1.20
  const phase       = (h % 628) / 100                 // 0 – 2π
  const baseRx      = ((h % 314) / 100) - Math.PI / 2
  const baseRy      = ((h >> 4 & 0xff) / 255) * Math.PI
  const driftX      = ((h >> 8  & 0xff) / 255 - 0.5) * 0.4
  const driftZ      = ((h >> 16 & 0xff) / 255 - 0.5) * 0.4

  const colorObj = useMemo(() => new THREE.Color(color), [color])

  // Visual targets by affecting state
  const ringOpacityFull  = affecting ? 0.35 : 0.07
  const elecOpacityFull  = affecting ? 1.0  : 0.15
  const elecEmissiveFull = affecting ? 1.4  : 0.2
  const elecRadius       = affecting ? 0.08 : 0.04

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    // Record birth on first frame
    if (birthRef.current < 0) birthRef.current = t
    const age = t - birthRef.current
    const entryProgress = easeOutCubic(Math.min(age / 0.5, 1))

    // Smooth stability
    smoothStab.current += (targetStability - smoothStab.current) * 0.03
    const stab = smoothStab.current

    // Orbit rotation drifts more at higher stability
    if (groupRef.current) {
      groupRef.current.scale.setScalar(entryProgress)
      const drift = stab * t * 0.15
      groupRef.current.rotation.x = baseRx + driftX * drift
      groupRef.current.rotation.y = baseRy + driftZ * drift * 0.7
      groupRef.current.rotation.z = driftZ * drift * 0.4
    }

    // Electron position along orbit (torus lies in XY plane)
    if (electronRef.current) {
      const angle = t * speed + phase
      electronRef.current.position.set(orbitRadius * Math.cos(angle), orbitRadius * Math.sin(angle), 0)
    }

    const p = entryProgress
    if (ringMatRef.current)  ringMatRef.current.opacity = p * ringOpacityFull
    if (elecMatRef.current) {
      elecMatRef.current.opacity = p * elecOpacityFull
      elecMatRef.current.emissiveIntensity = p * elecEmissiveFull
    }
  })

  return (
    <group ref={groupRef}>
      {/* Orbit ring */}
      <mesh>
        <torusGeometry args={[orbitRadius, 0.012, 8, 64]} />
        <meshStandardMaterial
          ref={ringMatRef}
          color={colorObj}
          emissive={colorObj}
          emissiveIntensity={0.5}
          transparent
          opacity={ringOpacityFull}
        />
      </mesh>
      {/* Electron */}
      <mesh
        ref={electronRef}
        onPointerOver={(e) => { e.stopPropagation(); onHover(hoverInfo) }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[elecRadius, 10, 10]} />
        <meshStandardMaterial
          ref={elecMatRef}
          color={colorObj}
          emissive={colorObj}
          emissiveIntensity={elecEmissiveFull}
          transparent
          opacity={elecOpacityFull}
        />
      </mesh>
    </group>
  )
}

// ─── Idle Particle Cloud ──────────────────────────────────────────────────────

function IdleParticleCloud() {
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
    if (pointsRef.current) {
      const t = clock.getElapsedTime()
      pointsRef.current.rotation.y = t * 0.08
      pointsRef.current.rotation.x = t * 0.03
    }
  })
  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial color="#94a3b8" size={0.018} transparent opacity={0.5} sizeAttenuation />
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
  onHover: (info: HoverInfo | null) => void
}

function AtomScene({ decision, activeConstraints, affectingIds, reasonCodes, onHover }: AtomSceneProps) {
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
      hoverInfo: { type: c.type, label: getConstraintSummary(c), color: TYPE_COLOR[c.type] ?? '#a78bfa' },
    })),
    ...syntheticNodes.map((code) => ({
      id: code,
      color: REASON_CODE_COLOR[code],
      affecting: true,  // internal signals are always affecting
      hoverInfo: { type: REASON_CODE_GROUP[code] ?? 'INTERNAL', label: code.replace(/_/g, ' '), color: REASON_CODE_COLOR[code] },
    })),
  ], [activeConstraints, affectingIds, syntheticNodes])

  const affectingCount = nodes.filter(n => n.affecting).length
  // targetStability drives nucleus + orbit drift — based on affecting count only
  const targetStability = Math.min(affectingCount / 8, 1)

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[2, 2, 2]} color={decisionColor} intensity={0.8} />
      <pointLight position={[-2, -1, -2]} color="#ffffff" intensity={0.4} />

      <AtomNucleus decisionColor={decisionColor} affectingCount={affectingCount} />

      {nodes.length === 0 ? (
        <IdleParticleCloud />
      ) : (
        nodes.map((node) => (
          <ElectronOrbit
            key={node.id}
            nodeId={node.id}
            color={node.color}
            targetStability={targetStability}
            affecting={node.affecting}
            onHover={onHover}
            hoverInfo={node.hoverInfo}
          />
        ))
      )}

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

  return (
    <div style={{ position: 'relative', height: fullscreen ? '100vh' : '260px', userSelect: 'none' }}>
      <Canvas
        style={{ height: '100%', background: 'transparent', userSelect: 'none' }}
        camera={{ position: [0, 1.5, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        <OrbitControls
          ref={orbitRef as any}
          autoRotate={autoRotate}
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
