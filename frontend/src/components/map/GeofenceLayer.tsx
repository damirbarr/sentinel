import { Polygon, Tooltip, Circle } from 'react-leaflet'
import { useEventsStore } from '../../store/events.store'
import type { GeofencePayload, WeatherPayload } from '../../types'

const STYLES: Record<string, { color: string; fillColor: string; fillOpacity: number }> = {
  FORBIDDEN: { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.12 },
  CAUTION:   { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.10 },
  SLOW:      { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.10 },
}

export default function GeofenceLayer() {
  const events = useEventsStore((s) => s.events)
  return (
    <>
      {Object.values(events)
        .filter((e) => e.type === 'GEOFENCE' && e.active)
        .map((event) => {
          const p = event.payload as GeofencePayload
          const style = STYLES[p.type] ?? STYLES.CAUTION
          return (
            <Polygon
              key={event.id}
              positions={p.polygon.map((pt) => [pt.lat, pt.lng] as [number, number])}
              pathOptions={{ ...style, weight: 2, dashArray: p.type === 'FORBIDDEN' ? undefined : '6 4' }}
            >
              <Tooltip sticky>
                <div className="text-xs">
                  <div className="font-medium">{p.type} ZONE</div>
                  {p.label && <div className="text-slate-400">{p.label}</div>}
                </div>
              </Tooltip>
            </Polygon>
          )
        })}
      {Object.values(events)
        .filter((e) => e.type === 'WEATHER' && e.active)
        .map((event) => {
          const p = event.payload as WeatherPayload
          if (!p.center || !p.radiusMeters) return null
          return (
            <Circle
              key={event.id}
              center={[p.center.lat, p.center.lng]}
              radius={p.radiusMeters}
              pathOptions={{
                color: '#f59e0b',
                fillColor: '#f59e0b',
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '4 6',
              }}
            >
              <Tooltip sticky>
                <div className="text-xs">
                  <div className="font-medium">WEATHER ZONE</div>
                  <div className="text-slate-400">{p.condition.replace('_', ' ')} · {p.severity}</div>
                  <div className="text-slate-400">{(p.radiusMeters / 1000).toFixed(1)} km radius</div>
                </div>
              </Tooltip>
            </Circle>
          )
        })}
    </>
  )
}
