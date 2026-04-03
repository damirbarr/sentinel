import { useRef, useEffect } from 'react'

// ─── Particle types ───────────────────────────────────────────────────────────

interface RainParticle  { x: number; y: number; speed: number; length: number }
interface SnowParticle  { x: number; y: number; speed: number; radius: number; phase: number }
interface FogParticle   { x: number; y: number; rx: number; ry: number; alpha: number; driftDir: number; driftSpeed: number }
interface IceParticle   { x: number; y: number; speed: number; phase: number }
interface WindParticle  { x: number; y: number; speed: number; length: number }

interface ParticleStore {
  rain:  RainParticle[]
  snow:  SnowParticle[]
  fog:   FogParticle[]
  ice:   IceParticle[]
  wind:  WindParticle[]
}

// ─── Initialisation helpers ───────────────────────────────────────────────────

function initRain(w: number, h: number): RainParticle[] {
  return Array.from({ length: 320 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    speed: 6 + Math.random() * 4,
    length: 15 + Math.random() * 8,
  }))
}

function initSnow(w: number, h: number): SnowParticle[] {
  return Array.from({ length: 220 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    speed: 0.8 + Math.random() * 1.2,
    radius: 1.5 + Math.random() * 2.5,
    phase: Math.random() * Math.PI * 2,
  }))
}

function initFog(w: number, h: number): FogParticle[] {
  return Array.from({ length: 14 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    rx: 80 + Math.random() * 120,
    ry: 40 + Math.random() * 60,
    alpha: 0.02 + Math.random() * 0.04,
    driftDir: Math.random() < 0.5 ? -1 : 1,
    driftSpeed: 0.1 + Math.random() * 0.2,
  }))
}

function initIce(w: number, h: number): IceParticle[] {
  return Array.from({ length: 80 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    speed: 0.2 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
  }))
}

function initWind(w: number, h: number): WindParticle[] {
  return Array.from({ length: 120 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    speed: 8 + Math.random() * 10,
    length: 20 + Math.random() * 30,
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  weatherConditions: string[]
}

export default function WeatherOverlay({ weatherConditions }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number>(0)
  const particles  = useRef<ParticleStore>({ rain: [], snow: [], fog: [], ice: [], wind: [] })
  const frameRef   = useRef(0)

  // Resize canvas to fill parent and re-init particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    function resize() {
      if (!canvas || !parent) return
      canvas.width  = parent.offsetWidth
      canvas.height = parent.offsetHeight
      initAll(canvas.width, canvas.height)
    }

    function initAll(w: number, h: number) {
      const p = particles.current
      p.rain = weatherConditions.includes('HEAVY_RAIN') ? initRain(w, h) : []
      p.snow = weatherConditions.includes('SNOW')       ? initSnow(w, h) : []
      p.fog  = weatherConditions.includes('FOG')        ? initFog(w, h)  : []
      p.ice  = weatherConditions.includes('ICE')        ? initIce(w, h)  : []
      p.wind = weatherConditions.includes('STRONG_WIND')? initWind(w, h) : []
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [weatherConditions])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (weatherConditions.length === 0) {
      cancelAnimationFrame(rafRef.current)
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    function draw() {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const w = canvas.width
      const h = canvas.height
      const t = (frameRef.current += 1)

      ctx.clearRect(0, 0, w, h)

      const p = particles.current

      // ── HEAVY_RAIN ──────────────────────────────────────────────────────────
      if (p.rain.length) {
        ctx.save()
        ctx.strokeStyle = 'rgba(180, 210, 255, 0.55)'
        ctx.lineWidth = 1.2
        for (const r of p.rain) {
          // angle ~70° from vertical → sin(70°)≈0.94, cos(70°)≈0.34
          const dx = r.length * 0.36
          const dy = r.length * 0.93
          ctx.beginPath()
          ctx.moveTo(r.x, r.y)
          ctx.lineTo(r.x + dx, r.y + dy)
          ctx.stroke()
          r.x += dx / (dy / r.speed)
          r.y += r.speed
          if (r.y > h + r.length) {
            r.y = -r.length
            r.x = Math.random() * w
          }
        }
        ctx.restore()
      }

      // ── SNOW ─────────────────────────────────────────────────────────────────
      if (p.snow.length) {
        ctx.save()
        ctx.fillStyle = 'rgba(230, 240, 255, 0.80)'
        for (const s of p.snow) {
          const sway = Math.sin(t * 0.02 + s.phase) * 0.8
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
          ctx.fill()
          s.x += sway
          s.y += s.speed
          if (s.y > h + s.radius) {
            s.y = -s.radius
            s.x = Math.random() * w
          }
        }
        ctx.restore()
      }

      // ── FOG ──────────────────────────────────────────────────────────────────
      if (p.fog.length) {
        ctx.save()
        for (const f of p.fog) {
          const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, Math.max(f.rx, f.ry))
          grad.addColorStop(0, `rgba(210, 215, 230, ${f.alpha})`)
          grad.addColorStop(1, 'rgba(210, 215, 230, 0)')
          ctx.save()
          ctx.scale(1, f.ry / f.rx)
          ctx.beginPath()
          ctx.arc(f.x, f.y * (f.rx / f.ry), f.rx, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
          ctx.restore()
          f.x += f.driftDir * f.driftSpeed
          if (f.x > w + f.rx) f.x = -f.rx
          if (f.x < -f.rx)    f.x =  w + f.rx
        }
        ctx.restore()
      }

      // ── ICE ──────────────────────────────────────────────────────────────────
      if (p.ice.length) {
        ctx.save()
        for (const ic of p.ice) {
          const shimmer = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.15 + ic.phase))
          ctx.fillStyle = `rgba(180, 220, 255, ${shimmer * 0.7})`
          ctx.beginPath()
          ctx.arc(ic.x, ic.y, 1.5, 0, Math.PI * 2)
          ctx.fill()
          ic.y += ic.speed
          if (ic.y > h + 2) {
            ic.y = -2
            ic.x = Math.random() * w
          }
        }
        ctx.restore()
      }

      // ── STRONG_WIND ──────────────────────────────────────────────────────────
      if (p.wind.length) {
        ctx.save()
        ctx.strokeStyle = 'rgba(200, 210, 220, 0.45)'
        ctx.lineWidth = 0.8
        for (const wnd of p.wind) {
          ctx.beginPath()
          ctx.moveTo(wnd.x, wnd.y)
          ctx.lineTo(wnd.x + wnd.length, wnd.y)
          ctx.stroke()
          wnd.x += wnd.speed
          if (wnd.x > w + wnd.length) {
            wnd.x = -wnd.length
            wnd.y = Math.random() * h
          }
        }
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [weatherConditions])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 500,
      }}
    />
  )
}
