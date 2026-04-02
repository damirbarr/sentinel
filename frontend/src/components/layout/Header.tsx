import { useVehiclesStore } from '../../store/vehicles.store'

export default function Header() {
  const vehicles = useVehiclesStore((s) => s.vehicles)
  const all = Object.values(vehicles)
  const connected = all.filter((v) => v.connected).length

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-5 bg-surface-1 border-b border-surface-border-bright z-20 relative overflow-hidden">
      {/* Subtle top gradient stripe */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/40 to-transparent" />
      {/* Radial depth on the right */}
      <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-accent-violet/5 to-transparent pointer-events-none" />

      <div className="flex items-center gap-3 relative">
        {/* Logo hex — larger with cyan glow */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-violet/20 border border-accent-cyan/30 flex items-center justify-center shadow-glow">
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" stroke="#22d3ee" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="7" cy="7" r="2" fill="#22d3ee"/>
          </svg>
        </div>
        {/* Gradient title */}
        <span className="font-bold text-sm tracking-widest uppercase gradient-text">SENTINEL</span>
        <span className="text-surface-border-bright text-xs font-mono hidden sm:block">Fleet Control Console</span>
      </div>

      <div className="flex items-center gap-4 relative">
        {/* Vehicle count with cyan glow border */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-surface-border border-glow-cyan">
          <span className="text-xs text-slate-500">Vehicles</span>
          <span className="text-xs font-mono font-bold text-accent-cyan">{connected}/{all.length}</span>
        </div>
        {/* LIVE indicator — double ring pulse */}
        <div className="relative flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-accent-green/30">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-40 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green animate-ping-subtle" />
          </span>
          <span className="text-xs font-bold tracking-widest text-accent-green">LIVE</span>
        </div>
      </div>
    </header>
  )
}
