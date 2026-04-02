import { useState } from 'react'
import WeatherForm from './WeatherForm'
import GeofenceForm from './GeofenceForm'
import NetworkForm from './NetworkForm'
import ActiveConstraints from './ActiveConstraints'
import { useVehiclesStore } from '../../store/vehicles.store'
import { useUIStore } from '../../store/ui.store'

type Tab = 'constraints' | 'weather' | 'geofence' | 'network'
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'constraints', label: 'Active', icon: '◈' },
  { id: 'weather',     label: 'Weather', icon: '⛈' },
  { id: 'geofence',    label: 'Geofence', icon: '⬡' },
  { id: 'network',     label: 'Network', icon: '⊟' },
]

export default function ControlPanel() {
  const [tab, setTab] = useState<Tab>('constraints')
  const vehicles = useVehiclesStore((s) => s.vehicles)
  const { setSelectedVehicle, selectedVehicleId } = useUIStore()
  const vehicleList = Object.values(vehicles)
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-surface-border">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Operator Console</h2>
      </div>
      {vehicleList.length > 0 ? (
        <div className="px-3 py-2 border-b border-surface-border">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Fleet</p>
          <div className="space-y-1">
            {vehicleList.map((v) => (
              <button key={v.vehicleId} onClick={() => setSelectedVehicle(v.vehicleId)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                  selectedVehicleId === v.vehicleId
                    ? 'bg-accent-blue/15 border border-accent-blue/30'
                    : 'hover:bg-surface-2 border border-transparent'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  v.decision === 'NORMAL' ? 'bg-decision-normal' :
                  v.decision === 'DEGRADED_SPEED' ? 'bg-decision-degraded' :
                  v.decision === 'SAFE_STOP_RECOMMENDED' ? 'bg-decision-stop animate-pulse' :
                  'bg-decision-reroute animate-pulse'
                }`} />
                <span className="text-xs font-mono text-slate-300 truncate flex-1">{v.vehicleId}</span>
                <span className="text-[10px] font-mono text-slate-500">{v.speedKmh.toFixed(0)}<span className="text-slate-600"> km/h</span></span>
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
        {tab === 'network'     && <NetworkForm />}
      </div>
    </div>
  )
}
