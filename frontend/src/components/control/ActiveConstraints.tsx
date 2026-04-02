import { api } from '../../api/http'
import { useEventsStore } from '../../store/events.store'
import { useUIStore } from '../../store/ui.store'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import type { ActiveEvent, GeofencePayload, NetworkPayload, WeatherPayload } from '../../types'

function summary(event: ActiveEvent): { label: string; detail: string; color: 'red' | 'amber' | 'blue' | 'orange'; accentBar: string } {
  if (event.type === 'WEATHER') {
    const p = event.payload as WeatherPayload
    const isHigh = p.severity === 'HIGH' || p.severity === 'EXTREME'
    return {
      label: `Weather: ${p.condition.replace(/_/g, ' ')}`,
      detail: `Severity: ${p.severity}`,
      color: isHigh ? 'red' : 'amber',
      accentBar: isHigh ? 'bg-accent-red' : 'bg-accent-amber',
    }
  }
  if (event.type === 'GEOFENCE') {
    const p = event.payload as GeofencePayload
    const color = p.type === 'FORBIDDEN' ? 'red' : p.type === 'CAUTION' ? 'amber' : 'blue'
    const accentBar = p.type === 'FORBIDDEN' ? 'bg-accent-red' : p.type === 'CAUTION' ? 'bg-accent-amber' : 'bg-accent-blue'
    return { label: `Geofence: ${p.type}${p.label ? ` — ${p.label}` : ''}`, detail: `${p.polygon.length} vertices`, color, accentBar }
  }
  const p = event.payload as NetworkPayload
  const color = p.severity === 'LOST' ? 'red' : 'orange'
  const accentBar = p.severity === 'LOST' ? 'bg-accent-red' : 'bg-accent-orange'
  return { label: `Network: ${p.severity}`, detail: p.vehicleId ? `Vehicle: ${p.vehicleId}` : 'Global', color, accentBar }
}

function getFlyTarget(event: ActiveEvent): { lat: number; lng: number; zoom?: number } | null {
  if (event.type === 'WEATHER') {
    const p = event.payload as WeatherPayload
    if (p.center) return { lat: p.center.lat, lng: p.center.lng, zoom: 14 }
    return null
  }
  if (event.type === 'GEOFENCE') {
    const p = event.payload as GeofencePayload
    if (p.polygon.length === 0) return null
    const lat = p.polygon.reduce((sum, pt) => sum + pt.lat, 0) / p.polygon.length
    const lng = p.polygon.reduce((sum, pt) => sum + pt.lng, 0) / p.polygon.length
    return { lat, lng, zoom: 14 }
  }
  return null
}

export default function ActiveConstraints() {
  const events = useEventsStore((s) => s.events)
  const active = Object.values(events).filter((e) => e.active)
  const { setHighlightedConstraintId, setMapFlyTarget } = useUIStore()

  if (active.length === 0) {
    return (
      <EmptyState
        icon={<span className="text-2xl text-surface-border-bright">◈</span>}
        title="No active constraints"
        description="Use the tabs above to publish weather, geofence, or network events."
      />
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3 font-mono">
        <span className="text-accent-cyan font-bold">{active.length}</span>{' '}
        active constraint{active.length !== 1 ? 's' : ''}
      </p>
      {active.map((event) => {
        const { label, detail, color, accentBar } = summary(event)
        const flyTarget = getFlyTarget(event)
        return (
          <div
            key={event.id}
            className={`relative flex items-start gap-3 p-3 rounded-md bg-surface-2 border border-surface-border hover:border-surface-border-bright hover:bg-surface-3 transition-all group overflow-hidden${flyTarget ? ' cursor-pointer' : ''}`}
            onMouseEnter={() => setHighlightedConstraintId(event.id)}
            onMouseLeave={() => setHighlightedConstraintId(null)}
            onClick={() => { if (flyTarget) setMapFlyTarget(flyTarget) }}
          >
            {/* Left colored accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl ${accentBar}`} />
            <div className="pl-1">
              <Badge color={color}>{event.type}</Badge>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{detail}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); api.clearEvent(event.id) }}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-5 h-5 rounded bg-accent-red/10 hover:bg-accent-red/20 border border-accent-red/20"
              title="Clear constraint"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 1l6 6M7 1L1 7" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
