import { useVehiclesStore } from '../../store/vehicles.store'
import { useEventsStore } from '../../store/events.store'
import BrainCanvas from './BrainCanvas'
import type { DecisionState } from '../../types'

const DECISION_COLOR: Record<DecisionState, string> = {
  NORMAL: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5',
  DEGRADED_SPEED: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  SAFE_STOP_RECOMMENDED: 'text-red-400 border-red-400/30 bg-red-400/5',
  REROUTE_RECOMMENDED: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
}

const REASON_META: Record<string, { label: string; color: string }> = {
  WEATHER_HEAVY_RAIN:         { label: 'Heavy Rain',    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  WEATHER_FOG:                { label: 'Fog',           color: 'text-amber-300 bg-amber-300/10 border-amber-300/20' },
  WEATHER_STRONG_WIND:        { label: 'Strong Wind',   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  WEATHER_LOW_VISIBILITY:     { label: 'Low Visibility',color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  IN_GEOFENCE_FORBIDDEN_ZONE: { label: 'Forbidden Zone',color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  IN_GEOFENCE_CAUTION_ZONE:   { label: 'Caution Zone',  color: 'text-red-300 bg-red-300/10 border-red-300/20' },
  IN_GEOFENCE_SLOW_ZONE:      { label: 'Slow Zone',     color: 'text-red-300 bg-red-300/10 border-red-300/20' },
  GEOFENCE_AHEAD:             { label: 'Geofence Ahead',color: 'text-red-300 bg-red-300/10 border-red-300/20' },
  NETWORK_POOR:               { label: 'Poor Signal',   color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  NETWORK_LOST:               { label: 'Signal Lost',   color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  MULTI_FACTOR_RISK:          { label: 'Multi-Risk',    color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
}

const REASON_DESCRIPTIONS: Record<string, string> = {
  WEATHER_HEAVY_RAIN:         'Heavy precipitation reducing traction and visibility',
  WEATHER_FOG:                'Dense fog limiting sensor range',
  WEATHER_STRONG_WIND:        'High wind speeds affecting vehicle stability',
  WEATHER_LOW_VISIBILITY:     'Visibility below safe operating threshold',
  IN_GEOFENCE_FORBIDDEN_ZONE: 'Vehicle is inside a forbidden no-go zone',
  IN_GEOFENCE_CAUTION_ZONE:   'Vehicle is inside a caution zone — proceed carefully',
  IN_GEOFENCE_SLOW_ZONE:      'Vehicle is inside a speed-restricted zone',
  GEOFENCE_AHEAD:             'A geofence boundary detected ahead',
  NETWORK_POOR:               'Degraded uplink — telemetry may be delayed',
  NETWORK_LOST:               'No network connectivity — autonomous fallback active',
  MULTI_FACTOR_RISK:          'Multiple simultaneous risk factors detected',
}

export default function VehicleProfile({ vehicleId }: { vehicleId: string }) {
  const vehicle = useVehiclesStore((s) => s.vehicles[vehicleId])
  const events = useEventsStore((s) => s.events)
  if (!vehicle) return null

  const activeConstraints = vehicle.activeConstraintIds
    .map((id) => events[id])
    .filter(Boolean)

  return (
    <div className="flex flex-col gap-4 p-4 select-none" style={{ userSelect: 'none' }}>
      {/* Brain visualization */}
      <div className="flex flex-col items-center pt-2" style={{ userSelect: 'none' }}>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500 uppercase mb-3">
          Sentinel Cognition
        </p>
        <BrainCanvas
          decision={vehicle.decision}
          reasonCodes={vehicle.reasonCodes}
          speedKmh={vehicle.speedKmh}
        />
      </div>

      {/* Decision state card */}
      <div className={`rounded-xl border p-3 ${DECISION_COLOR[vehicle.decision]}`} style={{ userSelect: 'none' }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-1">Current Decision</p>
        <p className="font-mono font-bold text-sm">{vehicle.decision.replace(/_/g, ' ')}</p>
      </div>

      {/* Telemetry grid */}
      <div className="grid grid-cols-2 gap-2" style={{ userSelect: 'none' }}>
        {[
          { label: 'Speed', value: `${vehicle.speedKmh.toFixed(0)} km/h` },
          { label: 'Heading', value: `${vehicle.position.heading.toFixed(0)}°` },
          { label: 'Latitude', value: vehicle.position.lat.toFixed(5) },
          { label: 'Longitude', value: vehicle.position.lng.toFixed(5) },
        ].map(({ label, value }) => (
          <div key={label} className="p-2.5 rounded-lg bg-surface-2 border border-surface-border">
            <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
            <p className="text-xs font-mono font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Active signals */}
      {vehicle.reasonCodes.length > 0 && (
        <div style={{ userSelect: 'none' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Active Signals</p>
          <div className="flex flex-wrap gap-1.5">
            {vehicle.reasonCodes.map((code) => {
              const meta = REASON_META[code] ?? { label: code, color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' }
              return (
                <div key={code} className="relative group">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${meta.color}`}>
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {meta.label}
                  </span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {REASON_DESCRIPTIONS[code] ?? code}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Affecting constraints */}
      {activeConstraints.length > 0 && (
        <div style={{ userSelect: 'none' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Constraint Feed</p>
          <div className="space-y-1.5">
            {activeConstraints.map((event) => (
              <div key={event.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-2 border border-surface-border">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  event.type === 'WEATHER' ? 'bg-amber-400/20 text-amber-400' :
                  event.type === 'GEOFENCE' ? 'bg-red-400/20 text-red-400' :
                  'bg-orange-400/20 text-orange-400'
                }`}>{event.type}</span>
                <span className="text-[10px] font-mono text-slate-400 truncate">{event.id.slice(0, 12)}…</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-600 text-center">
        Updated {new Date(vehicle.lastSeenAt).toLocaleTimeString()}
      </p>
    </div>
  )
}
