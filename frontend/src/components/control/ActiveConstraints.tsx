import { api } from '../../api/http'
import { useEventsStore } from '../../store/events.store'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import type { ActiveEvent, GeofencePayload, NetworkPayload, WeatherPayload } from '../../types'

function summary(event: ActiveEvent): { label: string; detail: string; color: 'red' | 'amber' | 'blue' | 'orange' } {
  if (event.type === 'WEATHER') {
    const p = event.payload as WeatherPayload
    return { label: `Weather: ${p.condition.replace(/_/g, ' ')}`, detail: `Severity: ${p.severity}`, color: p.severity === 'HIGH' || p.severity === 'EXTREME' ? 'red' : 'amber' }
  }
  if (event.type === 'GEOFENCE') {
    const p = event.payload as GeofencePayload
    return { label: `Geofence: ${p.type}${p.label ? ` — ${p.label}` : ''}`, detail: `${p.polygon.length} vertices`, color: p.type === 'FORBIDDEN' ? 'red' : p.type === 'CAUTION' ? 'amber' : 'blue' }
  }
  const p = event.payload as NetworkPayload
  return { label: `Network: ${p.severity}`, detail: p.vehicleId ? `Vehicle: ${p.vehicleId}` : 'Global', color: p.severity === 'LOST' ? 'red' : 'orange' }
}

export default function ActiveConstraints() {
  const events = useEventsStore((s) => s.events)
  const active = Object.values(events).filter((e) => e.active)

  if (active.length === 0) {
    return <EmptyState icon={<span className="text-base">◈</span>} title="No active constraints" description="Use the tabs above to publish weather, geofence, or network events." />
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3">{active.length} active constraint{active.length !== 1 ? 's' : ''}</p>
      {active.map((event) => {
        const { label, detail, color } = summary(event)
        return (
          <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-2 border border-surface-border group">
            <Badge color={color}>{event.type}</Badge>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
            </div>
            <button onClick={() => api.clearEvent(event.id)} className="shrink-0 text-xs text-slate-600 hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100">
              clear
            </button>
          </div>
        )
      })}
    </div>
  )
}
