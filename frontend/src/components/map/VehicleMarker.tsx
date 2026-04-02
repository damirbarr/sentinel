import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { useUIStore } from '../../store/ui.store'
import type { VehicleStatus } from '../../types'

const DECISION_COLORS: Record<string, string> = {
  NORMAL: '#10b981',
  DEGRADED_SPEED: '#f59e0b',
  SAFE_STOP_RECOMMENDED: '#ef4444',
  REROUTE_RECOMMENDED: '#8b5cf6',
}

function vehicleIcon(decision: string, connected: boolean, heading: number): L.DivIcon {
  const color = connected ? (DECISION_COLORS[decision] ?? '#3b82f6') : '#4b5563'
  const svg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(${heading}deg);transform-origin:center">
    <circle cx="16" cy="16" r="13" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <path d="M16 8 L20 22 L16 19 L12 22 Z" fill="${color}"/>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [32, 32], iconAnchor: [16, 16] })
}

export default function VehicleMarker({ vehicle }: { vehicle: VehicleStatus }) {
  const { setSelectedVehicle, selectedVehicleId } = useUIStore()
  const isSelected = selectedVehicleId === vehicle.vehicleId
  return (
    <Marker
      position={[vehicle.position.lat, vehicle.position.lng]}
      icon={vehicleIcon(vehicle.decision, vehicle.connected, vehicle.position.heading)}
      eventHandlers={{ click: () => setSelectedVehicle(isSelected ? null : vehicle.vehicleId) }}
    >
      <Tooltip permanent={isSelected} direction="top" offset={[0, -18]}>
        <div className="text-xs">
          <div className="font-medium font-mono">{vehicle.vehicleId}</div>
          <div className="text-slate-400">{vehicle.speedKmh.toFixed(0)} km/h</div>
        </div>
      </Tooltip>
    </Marker>
  )
}
