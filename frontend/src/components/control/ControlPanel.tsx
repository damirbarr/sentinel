import { useState } from 'react'
import WeatherForm from './WeatherForm'
import GeofenceForm from './GeofenceForm'
import ActiveConstraints from './ActiveConstraints'
import { useVehiclesStore } from '../../store/vehicles.store'
import { useUIStore } from '../../store/ui.store'

type Tab = 'constraints' | 'weather' | 'geofence'
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'constraints', label: 'Constraints', icon: '⊛' },
  { id: 'weather',     label: 'Weather', icon: '⛈' },
  { id: 'geofence',    label: 'Geofence', icon: '⬡' },
]

export default function ControlPanel() {
  const [tab, setTab] = useState<Tab>('constraints')
  const vehicles = useVehiclesStore((s) => s.vehicles)
  const { setSelectedVehicle, selectedVehicleId, setFollowingVehicle, followingVehicleId, setMapFlyTarget } = useUIStore()
  const vehicleList = Object.values(vehicles)
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-surface-border">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Operator Console</h2>
      </div>
      {vehicleList.length > 0 ? (
        <div className="px-3 py-2 border-b border-surface-border">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Fleet</p>
          <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
            {vehicleList.map((v) => (
              <button key={v.vehicleId} onClick={() => setSelectedVehicle(selectedVehicleId === v.vehicleId ? null : v.vehicleId)}
                className={`group/row w-full flex items-center gap-2 px-1.5 py-1 rounded-lg text-left transition-colors ${
                  selectedVehicleId === v.vehicleId
                    ? 'bg-accent-blue/20 border border-accent-cyan/40 shadow-[0_0_8px_rgba(34,211,238,0.15)]'
                    : 'hover:bg-surface-2 border border-transparent'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  v.decision === 'NORMAL' ? 'bg-decision-normal' :
                  v.decision === 'DEGRADED_SPEED' ? 'bg-decision-degraded' :
                  v.decision === 'SAFE_STOP_RECOMMENDED' ? 'bg-decision-stop animate-pulse' :
                  'bg-decision-reroute animate-pulse'
                }`} />
                <span className="text-[11px] font-mono text-slate-300 truncate flex-1">{v.vehicleId}</span>
                <span className="text-[9px] font-mono text-slate-500">{v.speedKmh.toFixed(0)}<span className="text-slate-600"> km/h</span></span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFollowingVehicle(followingVehicleId === v.vehicleId ? null : v.vehicleId)
                    setMapFlyTarget({ lat: v.position.lat, lng: v.position.lng, zoom: 15 })
                  }}
                  className={`ml-1 shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 rounded ${
                    followingVehicleId === v.vehicleId
                      ? 'text-accent-cyan opacity-100'
                      : 'text-slate-600 hover:text-slate-300'
                  }`}
                  title={followingVehicleId === v.vehicleId ? 'Stop following' : 'Center & follow'}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <circle cx="5" cy="5" r="3"/>
                    <line x1="5" y1="0" x2="5" y2="2.5"/>
                    <line x1="5" y1="7.5" x2="5" y2="10"/>
                    <line x1="0" y1="5" x2="2.5" y2="5"/>
                    <line x1="7.5" y1="5" x2="10" y2="5"/>
                  </svg>
                </button>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 py-2 border-b border-surface-border">
          <p className="text-[10px] text-slate-600 italic">No vehicles connected</p>
        </div>
      )}
      <div className="flex border-b border-surface-border px-2 pt-2 gap-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-t-lg text-xs transition-colors ${tab === t.id ? 'bg-surface-2 text-white border border-b-0 border-surface-border' : 'text-slate-500 hover:text-slate-300'}`}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {tab === 'constraints' && <ActiveConstraints />}
        {tab === 'weather'     && <WeatherForm />}
        {tab === 'geofence'    && <GeofenceForm />}
      </div>
    </div>
  )
}
