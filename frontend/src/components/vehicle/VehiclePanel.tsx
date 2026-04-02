import { useVehiclesStore } from '../../store/vehicles.store'
import { useUIStore } from '../../store/ui.store'
import VehicleProfile from './VehicleProfile'

export default function VehiclePanel({ vehicleId }: { vehicleId: string }) {
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
          <div className={`w-2 h-2 rounded-full ${vehicle.connected ? 'bg-accent-green' : 'bg-slate-600'}`} />
          <span className="text-xs text-slate-500">{vehicle.connected ? 'Connected' : 'Offline'}</span>
          <button onClick={() => setSelectedVehicle(null)} className="ml-2 text-slate-600 hover:text-white text-xs transition-colors">✕</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <VehicleProfile vehicleId={vehicleId} />
      </div>
    </div>
  )
}
