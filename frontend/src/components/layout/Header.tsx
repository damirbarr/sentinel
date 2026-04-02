import { useVehiclesStore } from '../../store/vehicles.store'

export default function Header() {
  const vehicles = useVehiclesStore((s) => s.vehicles)
  const all = Object.values(vehicles)
  const connected = all.filter((v) => v.connected).length

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-5 bg-surface-1 border-b border-surface-border z-20">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center shadow-sm">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="7" cy="7" r="2" fill="white"/>
          </svg>
        </div>
        <span className="font-semibold text-white text-sm tracking-wide">Sentinel</span>
        <span className="text-surface-border text-xs font-mono">Fleet Control Console</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Vehicles</span>
          <span className="text-xs font-mono font-medium text-white">{connected}/{all.length}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-surface-border">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          <span className="text-xs font-medium text-accent-green">LIVE</span>
        </div>
      </div>
    </header>
  )
}
