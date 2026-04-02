import { useEventsStore } from '../../store/events.store'
import Badge from '../ui/Badge'
import type { GeofencePayload, NetworkPayload, WeatherPayload } from '../../types'

export default function ConstraintList({ constraintIds }: { constraintIds: string[] }) {
  const events = useEventsStore((s) => s.events)
  const constraints = constraintIds.map((id) => events[id]).filter(Boolean)
  if (constraints.length === 0) return <p className="text-xs text-slate-600 italic">No active constraints affecting this vehicle.</p>
  return (
    <div className="space-y-1.5">
      {constraints.map((c) => {
        const label = c.type === 'WEATHER' ? (c.payload as WeatherPayload).condition.replace(/_/g, ' ')
          : c.type === 'GEOFENCE' ? `${(c.payload as GeofencePayload).type} ZONE`
          : `NETWORK ${(c.payload as NetworkPayload).severity}`
        return (
          <div key={c.id} className="flex items-center gap-2">
            <Badge color={c.type === 'WEATHER' ? 'amber' : c.type === 'GEOFENCE' ? 'red' : 'orange'}>{c.type}</Badge>
            <span className="text-xs text-slate-300">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
