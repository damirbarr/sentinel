import { useVehiclesStore } from '../../store/vehicles.store'
import { useUIStore } from '../../store/ui.store'
import { useState, useEffect } from 'react'

export default function Header() {
  const total     = useVehiclesStore((s) => Object.keys(s.vehicles).length)
  const connected = useVehiclesStore((s) => Object.values(s.vehicles).filter((v) => v.connected).length)
  const toggleSettings = useUIStore((s) => s.toggleSettings)

  const [utc, setUtc] = useState(() => new Date().toUTCString().slice(17, 25))
  useEffect(() => {
    const id = setInterval(() => setUtc(new Date().toUTCString().slice(17, 25)), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-5 bg-surface-1 border-b border-surface-border z-20 relative overflow-hidden select-none" style={{ userSelect: 'none' }}>
      {/* 1px top accent gradient stripe */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-violet via-accent-cyan to-accent-violet" />
      {/* Radial depth on the right */}
      <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-accent-violet/5 to-transparent pointer-events-none" />

      <div className="flex items-center gap-3 relative">
        {/* Logo hex — violet glow */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-violet/20 to-accent-cyan/20 border border-accent-violet/40 flex items-center justify-center shadow-[0_0_12px_rgba(192,132,252,0.3)]">
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" stroke="#c084fc" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="7" cy="7" r="2" fill="#c084fc"/>
          </svg>
        </div>
        {/* Gradient title */}
        <span className="font-bold text-sm tracking-[0.3em] uppercase gradient-text">SENTINEL</span>
        <span className="text-surface-border-bright text-xs font-mono hidden sm:block">Fleet Control Console</span>
      </div>

      <div className="flex items-center gap-4 relative">
        {/* UTC clock */}
        <span className="text-[10px] font-mono text-slate-500 hidden md:block">{utc} UTC</span>
        {/* Vehicle count with cyan glow border */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-cyan/10 border border-accent-cyan/40 border-glow-cyan">
          <span className="text-xs text-slate-400">Vehicles</span>
          <span className="text-xs font-mono font-bold text-accent-cyan">{connected}/{total}</span>
        </div>
        {/* LIVE indicator — double ring pulse */}
        <div className="relative flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-accent-green/30">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-30 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green animate-ping-subtle" />
          </span>
          <span className="text-xs font-bold tracking-widest text-accent-green">LIVE</span>
        </div>
        {/* Settings gear button */}
        <button
          onClick={toggleSettings}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-2 border border-surface-border hover:border-surface-border-bright hover:bg-surface-3 transition-colors text-slate-400 hover:text-slate-200"
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}
