import { useState } from 'react'
import { useVehiclesStore } from '../../store/vehicles.store'
import { useUIStore } from '../../store/ui.store'
import DecisionBadge from './DecisionBadge'
import ConstraintList from './ConstraintList'
import Badge from '../ui/Badge'
import VehicleProfile from './VehicleProfile'

const REASON_LABELS: Record<string, string> = {
  WEATHER_HEAVY_RAIN: 'Heavy Rain', WEATHER_LOW_VISIBILITY: 'Low Visibility',
  WEATHER_STRONG_WIND: 'Strong Wind', WEATHER_FOG: 'Fog',
  GEOFENCE_AHEAD: 'Geofence Ahead', IN_GEOFENCE_FORBIDDEN_ZONE: 'Forbidden Zone',
  IN_GEOFENCE_SLOW_ZONE: 'Slow Zone', IN_GEOFENCE_CAUTION_ZONE: 'Caution Zone',
  NETWORK_POOR: 'Poor Network', NETWORK_LOST: 'Network Lost', MULTI_FACTOR_RISK: 'Multiple Factors',
}

export default function VehiclePanel({ vehicleId }: { vehicleId: string }) {
  const [view, setView] = useState<'status' | 'profile'>('status')
  const vehicle = useVehiclesStore((s) => s.vehicles[vehicleId])
  const { setSelectedVehicle } = useUIStore()
  if (!vehicle) return null
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-surface-border">
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Vehicle</h2>
          <p className="text-sm font-bold text-white font-mono mt-0.5">{vehicleId}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-surface-border text-xs">
            {(['status', 'profile'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  view === v ? 'bg-accent-blue/20 text-accent-blue font-semibold' : 'text-slate-500 hover:text-white'
                }`}>
                {v}
              </button>
            ))}
          </div>
          <div className={`w-2 h-2 rounded-full ${vehicle.connected ? 'bg-accent-green' : 'bg-slate-600'}`} />
          <span className="text-xs text-slate-500">{vehicle.connected ? 'Connected' : 'Offline'}</span>
          <button onClick={() => setSelectedVehicle(null)} className="ml-2 text-slate-600 hover:text-white text-xs transition-colors">✕</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {view === 'profile' ? (
          <VehicleProfile vehicleId={vehicleId} />
        ) : (
          <div className="p-4 space-y-5">
            <DecisionBadge decision={vehicle.decision} />
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-2 border border-surface-border">
                <p className="text-xs text-slate-500 mb-1">Speed</p>
                <p className="text-lg font-bold text-white font-mono">{vehicle.speedKmh.toFixed(0)}</p>
                <p className="text-xs text-slate-600">km/h</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-surface-border">
                <p className="text-xs text-slate-500 mb-1">Heading</p>
                <p className="text-lg font-bold text-white font-mono">{vehicle.position.heading.toFixed(0)}°</p>
                <p className="text-xs text-slate-600">bearing</p>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-surface-2 border border-surface-border">
                <p className="text-xs text-slate-500 mb-1">Position</p>
                <p className="text-xs font-mono text-white">{vehicle.position.lat.toFixed(5)}, {vehicle.position.lng.toFixed(5)}</p>
              </div>
            </div>
            {vehicle.reasonCodes.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Active Reasons</h3>
                <div className="flex flex-wrap gap-1.5">
                  {vehicle.reasonCodes.map((code) => (
                    <Badge key={code} color={code.startsWith('WEATHER') ? 'amber' : code.startsWith('GEOFENCE') || code.startsWith('IN_GEOFENCE') ? 'red' : code.startsWith('NETWORK') ? 'orange' : 'violet'}>
                      {REASON_LABELS[code] ?? code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Affecting Constraints</h3>
              <ConstraintList constraintIds={vehicle.activeConstraintIds} />
            </div>
            <div className="pt-2 border-t border-surface-border">
              <p className="text-xs text-slate-600">Last update: {new Date(vehicle.lastSeenAt).toLocaleTimeString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
