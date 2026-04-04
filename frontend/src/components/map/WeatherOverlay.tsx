import { useRef, useEffect } from 'react'
import { useMap } from 'react-leaflet'

export interface WeatherZone {
  condition: string
  center?: { lat: number; lng: number }
  radiusMeters?: number
}

// ─── Particle types (positions normalized to unit circle: sqrt(nx²+ny²) ≤ 1) ──

interface RainP   { nx: number; ny: number; speed: number; len: number }
interface SnowP   { nx: number; ny: number; speed: number; radius: number; phase: number }
interface FogBlob { nx: number; ny: number; blobR: number; alpha: number; driftNx: number; driftNy: number; driftSpeed: number }
interface IceP    { nx: number; ny: number; phase: number; r: number }
interface WindP   { nx: number; ny: number; speed: number; len: number; phase: number }

interface ZonePs { rain: RainP[]; snow: SnowP[]; fog: FogBlob[]; ice: IceP[]; wind: WindP[] }

// ─── Init helpers ─────────────────────────────────────────────────────────────

function inCircle(spread = 1) {
  const a = Math.random() * Math.PI * 2
  const r = Math.sqrt(Math.random()) * spread
  return { nx: r * Math.cos(a), ny: r * Math.sin(a) }
}

function initZonePs(condition: string): ZonePs {
  const ps: ZonePs = { rain: [], snow: [], fog: [], ice: [], wind: [] }
  switch (condition) {
    case 'HEAVY_RAIN':
      for (let i = 0; i < 200; i++) {
        const { nx } = inCircle()
        ps.rain.push({ nx, ny: Math.random() * 2 - 1, speed: 0.024 + Math.random() * 0.018, len: 0.06 + Math.random() * 0.04 })
      }
      break
    case 'SNOW':
      for (let i = 0; i < 160; i++) {
        const p = inCircle()
        ps.snow.push({ ...p, speed: 0.004 + Math.random() * 0.005, radius: 1.5 + Math.random() * 2.5, phase: Math.random() * Math.PI * 2 })
      }
      break
    case 'FOG': case 'LOW_VISIBILITY':
      for (let i = 0; i < 24; i++) {
        const p = inCircle(0.85)
        ps.fog.push({
          nx: p.nx, ny: p.ny,
          blobR: 0.30 + Math.random() * 0.42,
          alpha: 0.07 + Math.random() * 0.09,
          driftNx: Math.random() - 0.5,
          driftNy: (Math.random() - 0.5) * 0.5,
          driftSpeed: 0.00022 + Math.random() * 0.00025,
        })
      }
      break
    case 'ICE':
      for (let i = 0; i < 120; i++) {
        const p = inCircle()
        ps.ice.push({ ...p, phase: Math.random() * Math.PI * 2, r: 1.5 + Math.random() * 2.5 })
      }
      break
    case 'STRONG_WIND':
      for (let i = 0; i < 80; i++) {
        const p = inCircle()
        ps.wind.push({ ...p, speed: 0.013 + Math.random() * 0.015, len: 0.05 + Math.random() * 0.07, phase: Math.random() * Math.PI * 2 })
      }
      break
  }
  return ps
}

// ─── Draw functions ───────────────────────────────────────────────────────────

function drawRain(ctx: CanvasRenderingContext2D, cx: number, cy: number, rPx: number, ps: RainP[]) {
  ctx.strokeStyle = 'rgba(160, 190, 255, 0.50)'
  ctx.lineWidth = 1.0
  for (const r of ps) {
    const x = cx + r.nx * rPx
    const y = cy + r.ny * rPx
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + r.len * 0.36 * rPx, y + r.len * rPx)
    ctx.stroke()
    r.ny += r.speed
    r.nx += r.speed * 0.36
    if (r.ny > 1.15) {
      r.ny = -1.1 - Math.random() * 0.15
      r.nx = (Math.random() * 2 - 1) * 0.9
    }
  }
}

function drawSnow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rPx: number, ps: SnowP[], t: number) {
  ctx.fillStyle = 'rgba(230, 242, 255, 0.82)'
  for (const s of ps) {
    ctx.beginPath()
    ctx.arc(cx + s.nx * rPx, cy + s.ny * rPx, s.radius, 0, 2 * Math.PI)
    ctx.fill()
    s.nx += Math.sin(t * 0.012 + s.phase) * 0.0025
    s.ny += s.speed
    if (s.ny > 1.15) {
      s.ny = -1.05 - Math.random() * 0.1
      s.nx = (Math.random() * 2 - 1) * 0.9
    }
    // prevent indefinite horizontal drift
    if (Math.abs(s.nx) > 1.0) s.nx *= -0.9
  }
}

function drawFog(ctx: CanvasRenderingContext2D, cx: number, cy: number, rPx: number, ps: FogBlob[]) {
  // Milky base fill
  ctx.fillStyle = 'rgba(200, 212, 228, 0.18)'
  ctx.beginPath()
  ctx.arc(cx, cy, rPx, 0, 2 * Math.PI)
  ctx.fill()
  // Fluffy cloud blobs
  for (const f of ps) {
    const fx = cx + f.nx * rPx
    const fy = cy + f.ny * rPx
    const bR = f.blobR * rPx
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, bR)
    g.addColorStop(0,   `rgba(222, 230, 242, ${f.alpha})`)
    g.addColorStop(0.5, `rgba(212, 222, 236, ${f.alpha * 0.55})`)
    g.addColorStop(1,   'rgba(205, 216, 232, 0)')
    ctx.beginPath()
    ctx.arc(fx, fy, bR, 0, 2 * Math.PI)
    ctx.fillStyle = g
    ctx.fill()
    f.nx += f.driftNx * f.driftSpeed
    f.ny += f.driftNy * f.driftSpeed
    if (Math.sqrt(f.nx * f.nx + f.ny * f.ny) > 0.83) {
      f.driftNx *= -0.9
      f.driftNy *= -0.9
      f.nx *= 0.96
      f.ny *= 0.96
    }
  }
}

function drawIce(ctx: CanvasRenderingContext2D, cx: number, cy: number, rPx: number, ps: IceP[], t: number) {
  // Blue frost tint overlay
  ctx.fillStyle = 'rgba(140, 198, 255, 0.10)'
  ctx.beginPath()
  ctx.arc(cx, cy, rPx, 0, 2 * Math.PI)
  ctx.fill()
  // Static shimmer crystals — no movement, just shimmer
  for (const ic of ps) {
    const shimmer = 0.12 + 0.40 * Math.abs(Math.sin(t * 0.07 + ic.phase))
    ctx.fillStyle = `rgba(185, 222, 255, ${shimmer})`
    ctx.beginPath()
    ctx.arc(cx + ic.nx * rPx, cy + ic.ny * rPx, ic.r, 0, 2 * Math.PI)
    ctx.fill()
  }
}

function drawWind(ctx: CanvasRenderingContext2D, cx: number, cy: number, rPx: number, ps: WindP[], t: number) {
  ctx.lineWidth = 0.7
  for (const w of ps) {
    ctx.strokeStyle = `rgba(175, 192, 212, ${0.18 + 0.18 * Math.abs(Math.sin(t * 0.07 + w.phase))})`
    const x = cx + w.nx * rPx
    const y = cy + w.ny * rPx
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(cx + (w.nx + w.len) * rPx, y)
    ctx.stroke()
    w.nx += w.speed
    if (w.nx > 1.1) {
      w.nx = -1.1 - Math.random() * 0.2
      w.ny = (Math.random() * 2 - 1) * 0.88
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeatherOverlay({ weatherZones }: { weatherZones: WeatherZone[] }) {
  const map = useMap()
  const psMapRef  = useRef(new Map<string, ZonePs>())
  const zonesRef  = useRef(weatherZones)
  const rafRef    = useRef(0)
  const frameRef  = useRef(0)

  // Keep zones ref current; sync particle stores when condition set changes
  useEffect(() => {
    zonesRef.current = weatherZones
    const active = new Set(weatherZones.map(z => z.condition))
    for (const k of psMapRef.current.keys()) {
      if (!active.has(k)) psMapRef.current.delete(k)
    }
    for (const zone of weatherZones) {
      if (!psMapRef.current.has(zone.condition)) {
        psMapRef.current.set(zone.condition, initZonePs(zone.condition))
      }
    }
  }, [weatherZones])

  // Canvas lifecycle — only runs once per map instance
  useEffect(() => {
    const container = map.getContainer()
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:500'
    container.appendChild(canvas)

    function resize() {
      canvas.width  = container.offsetWidth
      canvas.height = container.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    function draw() {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const t = ++frameRef.current

      for (const zone of zonesRef.current) {
        if (!zone.center || !zone.radiusMeters) continue
        const ps = psMapRef.current.get(zone.condition)
        if (!ps) continue

        const cp = map.latLngToContainerPoint([zone.center.lat, zone.center.lng] as [number, number])
        const cx = cp.x, cy = cp.y
        const metersPerPx = 156543.03392 * Math.cos(zone.center.lat * Math.PI / 180) / Math.pow(2, map.getZoom())
        const rPx = zone.radiusMeters / metersPerPx
        if (rPx < 8) continue

        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, rPx, 0, 2 * Math.PI)
        ctx.clip()

        switch (zone.condition) {
          case 'HEAVY_RAIN':                   drawRain(ctx, cx, cy, rPx, ps.rain); break
          case 'SNOW':                         drawSnow(ctx, cx, cy, rPx, ps.snow, t); break
          case 'FOG': case 'LOW_VISIBILITY':   drawFog(ctx, cx, cy, rPx, ps.fog); break
          case 'ICE':                          drawIce(ctx, cx, cy, rPx, ps.ice, t); break
          case 'STRONG_WIND':                  drawWind(ctx, cx, cy, rPx, ps.wind, t); break
        }

        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      canvas.parentNode?.removeChild(canvas)
    }
  }, [map])

  return null
}
