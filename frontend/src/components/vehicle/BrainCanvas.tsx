import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, Points, PointMaterial } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { DecisionState, ReasonCode } from '../../types'

const DECISION_COLOR: Record<string, string> = {
  NORMAL: '#22d3ee',
  DEGRADED_SPEED: '#fbbf24',
  SAFE_STOP_RECOMMENDED: '#f87171',
  REROUTE_RECOMMENDED: '#fb923c',
}

export const SENSOR_NODES = [
  { id: 'WEATHER',  label: 'Weather Sensors',   color: '#fbbf24', codes: ['WEATHER_HEAVY_RAIN','WEATHER_FOG','WEATHER_STRONG_WIND','WEATHER_LOW_VISIBILITY'] },
  { id: 'GEOFENCE', label: 'Geofence Detection', color: '#f87171', codes: ['IN_GEOFENCE_FORBIDDEN_ZONE','IN_GEOFENCE_CAUTION_ZONE','IN_GEOFENCE_SLOW_ZONE','GEOFENCE_AHEAD'] },
  { id: 'NETWORK',  label: 'Network Telemetry',  color: '#fb923c', codes: ['NETWORK_POOR','NETWORK_LOST'] },
  { id: 'MULTI',    label: 'Multi-Factor Risk',  color: '#a78bfa', codes: ['MULTI_FACTOR_RISK'] },
  { id: 'SYSTEM',   label: 'System State',       color: '#34d399', codes: [] },
]

const NODE_ORBITS = [
  { radius: 1.2, yTilt: 0.3,  speed: 0.4 },
  { radius: 1.4, yTilt: -0.2, speed: 0.25 },
  { radius: 1.1, yTilt: 0.5,  speed: 0.55 },
  { radius: 1.6, yTilt: 0.1,  speed: 0.18 },
  { radius: 1.0, yTilt: -0.4, speed: 0.7 },
]

// Shared mutable position store (not React state — updated every frame)
const nodePositionStore: THREE.Vector3[] = SENSOR_NODES.map(() => new THREE.Vector3())

interface NeuralCoreProps {
  decisionColor: string
}

function NeuralCore({ decisionColor }: NeuralCoreProps) {
  const innerRef = useRef<THREE.Mesh>(null)
  const color = useMemo(() => new THREE.Color(decisionColor), [decisionColor])

  useFrame(({ clock }) => {
    if (innerRef.current) {
      const t = clock.getElapsedTime()
      const scale = 1 + 0.15 * Math.sin(t * 2.5)
      innerRef.current.scale.setScalar(scale)
    }
  })

  return (
    <group>
      <Sphere args={[0.55, 32, 32]}>
        <meshStandardMaterial color={color} transparent opacity={0.12} wireframe={false} />
      </Sphere>
      <Sphere args={[0.55, 32, 32]}>
        <meshStandardMaterial color={color} transparent opacity={0.08} wireframe={true} />
      </Sphere>
      <Sphere args={[0.3, 16, 16]} ref={innerRef}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
          transparent
          opacity={0.9}
        />
      </Sphere>
      <pointLight color={decisionColor} intensity={2} distance={3} />
    </group>
  )
}

interface OrbitalNodeProps {
  index: number
  nodeColor: string
  active: boolean
}

function OrbitalNode({ index, nodeColor, active }: OrbitalNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const orbit = NODE_ORBITS[index]
  const color = useMemo(() => new THREE.Color(nodeColor), [nodeColor])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const angle = t * orbit.speed + (index * Math.PI * 2) / SENSOR_NODES.length
    const x = orbit.radius * Math.cos(angle)
    const z = orbit.radius * Math.sin(angle)
    const y = orbit.yTilt * Math.sin(angle * 0.7)

    // Update shared position store
    nodePositionStore[index].set(x, y, z)

    if (meshRef.current) {
      meshRef.current.position.set(x, y, z)
      const targetScale = active ? 1.4 : 0.8
      const s = meshRef.current.scale.x
      meshRef.current.scale.setScalar(s + (targetScale - s) * 0.1)
    }
  })

  return (
    <Sphere args={[0.1, 8, 8]} ref={meshRef}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={active ? 2.5 : 0.3}
        transparent
        opacity={active ? 1.0 : 0.3}
      />
    </Sphere>
  )
}

interface ConnectionBeamProps {
  index: number
  color: string
  active: boolean
}

function ConnectionBeam({ index, color, active }: ConnectionBeamProps) {
  const lineRef = useRef<THREE.Line>(null)
  const geomRef = useRef<THREE.BufferGeometry>(null)
  const threeColor = useMemo(() => new THREE.Color(color), [color])

  const lineObject = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array([0, 0, 0, 0, 0, 0])
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.LineBasicMaterial({ color: threeColor, transparent: true, opacity: 0.7 })
    return new THREE.Line(geo, mat)
  }, [threeColor])

  useFrame(() => {
    if (!active) return
    const pos = nodePositionStore[index]
    const attr = lineObject.geometry.attributes.position as THREE.BufferAttribute
    attr.setXYZ(0, pos.x, pos.y, pos.z)
    attr.setXYZ(1, 0, 0, 0)
    attr.needsUpdate = true
  })

  if (!active) return null

  return <primitive object={lineObject} ref={lineRef} />
}

function ParticleCloud() {
  const pointsRef = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const count = 200
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1.8 + Math.random() * 0.4
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      const t = clock.getElapsedTime()
      pointsRef.current.rotation.y = t * 0.05
      pointsRef.current.rotation.x = t * 0.02
    }
  })

  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial
        color="#ffffff"
        size={0.02}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </Points>
  )
}

interface SceneProps {
  decision: DecisionState
  reasonCodes: ReasonCode[]
}

function Scene({ decision, reasonCodes }: SceneProps) {
  const decisionColor = DECISION_COLOR[decision] ?? '#22d3ee'

  const activeFlags = useMemo(
    () => SENSOR_NODES.map((node) =>
      node.id === 'SYSTEM' ? true : node.codes.some((c) => reasonCodes.includes(c as ReasonCode))
    ),
    [reasonCodes]
  )

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[3, 3, 3]} color={decisionColor} intensity={0.8} />
      <pointLight position={[-3, -2, 2]} color="#ffffff" intensity={0.3} />
      <pointLight position={[0, -3, -2]} color={decisionColor} intensity={0.5} />
      <pointLight position={[2, 2, -3]} color="#6366f1" intensity={0.4} />

      <NeuralCore decisionColor={decisionColor} />

      {SENSOR_NODES.map((node, i) => (
        <OrbitalNode
          key={node.id}
          index={i}
          nodeColor={node.color}
          active={activeFlags[i]}
        />
      ))}

      {SENSOR_NODES.map((node, i) => (
        <ConnectionBeam
          key={`beam-${node.id}`}
          index={i}
          color={node.color}
          active={activeFlags[i]}
        />
      ))}

      <ParticleCloud />

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} intensity={1.5} mipmapBlur />
      </EffectComposer>
    </>
  )
}

export interface BrainCanvasProps {
  decision: DecisionState
  reasonCodes: ReasonCode[]
  speedKmh: number
}

export default function BrainCanvas({ decision, reasonCodes }: BrainCanvasProps) {
  return (
    <div style={{ height: '260px', userSelect: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <OrbitControls
          autoRotate
          autoRotateSpeed={0.5}
          enableZoom={false}
          enablePan={false}
        />
        <Scene decision={decision} reasonCodes={reasonCodes} />
      </Canvas>
    </div>
  )
}
