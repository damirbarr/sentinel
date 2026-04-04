import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Points, PointMaterial } from '@react-three/drei'

// ─── HEAVY_RAIN ───────────────────────────────────────────────────────────────

function RainParticles() {
  const pointsRef = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const pos = new Float32Array(200 * 3)
    for (let i = 0; i < 200; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 3
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])

  useFrame(() => {
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < 200; i++) {
      pos[i * 3 + 1] -= 0.05
      if (pos[i * 3 + 1] < -3) {
        pos[i * 3 + 1] = 3
        pos[i * 3]     = (Math.random() - 0.5) * 6
        pos[i * 3 + 2] = (Math.random() - 0.5) * 6
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial color="#a0cfff" size={0.015} transparent opacity={0.7} sizeAttenuation />
    </Points>
  )
}

// ─── SNOW ─────────────────────────────────────────────────────────────────────

function SnowParticles() {
  const pointsRef = useRef<THREE.Points>(null)
  const { positions, phases } = useMemo(() => {
    const pos    = new Float32Array(150 * 3)
    const phases = new Float32Array(150)
    for (let i = 0; i < 150; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 6
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6
      phases[i]      = Math.random() * Math.PI * 2
    }
    return { positions: pos, phases }
  }, [])

  const frameRef = useRef(0)

  useFrame(() => {
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    const t   = (frameRef.current += 1)
    for (let i = 0; i < 150; i++) {
      pos[i * 3]     += Math.sin(t * 0.02 + phases[i]) * 0.003
      pos[i * 3 + 1] -= 0.01
      pos[i * 3 + 2] += Math.cos(t * 0.015 + phases[i] * 1.3) * 0.003
      if (pos[i * 3 + 1] < -3) {
        pos[i * 3 + 1] = 3
        pos[i * 3]     = (Math.random() - 0.5) * 6
        pos[i * 3 + 2] = (Math.random() - 0.5) * 6
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial color="#ffffff" size={0.02} transparent opacity={0.65} sizeAttenuation />
    </Points>
  )
}

// ─── FOG ──────────────────────────────────────────────────────────────────────

function FogParticles() {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.04
    meshRef.current.rotation.x = clock.getElapsedTime() * 0.015
  })
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2.5, 16, 16]} />
      <meshBasicMaterial color="#aaaacc" transparent opacity={0.06} side={THREE.BackSide} />
    </mesh>
  )
}

// ─── ICE ──────────────────────────────────────────────────────────────────────

function IceParticles() {
  const pointsRef = useRef<THREE.Points>(null)
  const matRef    = useRef<THREE.PointsMaterial>(null)
  const positions = useMemo(() => {
    const pos = new Float32Array(80 * 3)
    for (let i = 0; i < 80; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 4
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4
    }
    return pos
  }, [])

  useFrame(({ clock }) => {
    if (!matRef.current) return
    matRef.current.opacity = 0.3 + 0.5 * Math.abs(Math.sin(clock.getElapsedTime() * 4))
  })

  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial ref={matRef} color="#c8e8ff" size={0.018} transparent opacity={0.6} sizeAttenuation />
    </Points>
  )
}

// ─── STRONG_WIND ──────────────────────────────────────────────────────────────

function WindParticles() {
  const linesRef  = useRef<THREE.LineSegments>(null)
  const COUNT     = 100
  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 2 * 3) // 2 vertices per line
    for (let i = 0; i < COUNT; i++) {
      const y = (Math.random() - 0.5) * 5
      const z = (Math.random() - 0.5) * 3
      const x = (Math.random() - 0.5) * 6
      const len = 0.06 + Math.random() * 0.09
      // start
      pos[i * 6]     = x
      pos[i * 6 + 1] = y
      pos[i * 6 + 2] = z
      // end
      pos[i * 6 + 3] = x + len
      pos[i * 6 + 4] = y
      pos[i * 6 + 5] = z
    }
    return pos
  }, [])

  useFrame(() => {
    if (!linesRef.current) return
    const pos = linesRef.current.geometry.attributes.position.array as Float32Array
    const speed = 0.014
    for (let i = 0; i < COUNT; i++) {
      pos[i * 6]     += speed
      pos[i * 6 + 3] += speed
      // wrap: when start passes +3, teleport back to -3
      if (pos[i * 6] > 3) {
        const len = pos[i * 6 + 3] - pos[i * 6]
        pos[i * 6]     = -3
        pos[i * 6 + 3] = -3 + len
        pos[i * 6 + 1] = (Math.random() - 0.5) * 6
        pos[i * 6 + 4] = pos[i * 6 + 1]
        pos[i * 6 + 2] = (Math.random() - 0.5) * 6
        pos[i * 6 + 5] = pos[i * 6 + 2]
      }
    }
    linesRef.current.geometry.attributes.position.needsUpdate = true
  })

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3))
    return g
  }, [positions])

  return (
    <lineSegments ref={linesRef} geometry={geo}>
      <lineBasicMaterial color="#c8d4e0" transparent opacity={0.45} />
    </lineSegments>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function WeatherParticles({ conditions }: { conditions: string[] }) {
  if (!conditions || conditions.length === 0) return null

  return (
    <>
      {conditions.includes('HEAVY_RAIN')  && <RainParticles />}
      {conditions.includes('SNOW')        && <SnowParticles />}
      {conditions.includes('FOG')         && <FogParticles />}
      {conditions.includes('ICE')         && <IceParticles />}
      {conditions.includes('STRONG_WIND') && <WindParticles />}
    </>
  )
}
