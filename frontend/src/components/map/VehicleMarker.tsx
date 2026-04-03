import { useRef, useMemo } from 'react'
import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { useUIStore } from '../../store/ui.store'
import type { VehicleStatus } from '../../types'

const DECISION_COLORS: Record<string, string> = {
  NORMAL: '#4ade80',
  DEGRADED_SPEED: '#fcd34d',
  SAFE_STOP_RECOMMENDED: '#fc8181',
  REROUTE_RECOMMENDED: '#fdba74',
}

// Icon is ALWAYS the same total pixel size regardless of selected state.
// Consistent iconAnchor = no repositioning on click = stable hit-testing.
const TOTAL = 64
const C = TOTAL / 2

function vehicleIcon(decision: string, connected: boolean, heading: number, isSelected: boolean): L.DivIcon {
  const color = connected ? (DECISION_COLORS[decision] ?? '#60a5fa') : '#4b5563'

  const selRings = isSelected ? `
    <circle cx="${C}" cy="${C}" r="${C - 6}" stroke="${color}" stroke-width="2.5" fill="none" opacity="0.95"/>
    <circle cx="${C}" cy="${C}" r="${C - 2}" stroke="${color}" stroke-width="1" fill="none" opacity="0.2"/>
  ` : ''

  const svg = `<svg width="${TOTAL}" height="${TOTAL}" viewBox="0 0 ${TOTAL} ${TOTAL}" fill="none" xmlns="http://www.w3.org/2000/svg"
    style="transform:rotate(${heading}deg);transform-origin:center;filter:drop-shadow(0 0 6px ${color}88)">
    ${selRings}
    <circle cx="${C}" cy="${C}" r="14" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <path d="M${C} ${C - 9} L${C + 5} ${C + 7} L${C} ${C + 4} L${C - 5} ${C + 7} Z" fill="${color}"/>
  </svg>`

  return L.divIcon({ html: svg, className: '', iconSize: [TOTAL, TOTAL], iconAnchor: [C, C] })
}

export default function VehicleMarker({ vehicle }: { vehicle: VehicleStatus }) {
  const { setSelectedVehicle, selectedVehicleId, setFollowingVehicle } = useUIStore()
  const isSelected = selectedVehicleId === vehicle.vehicleId
  const markerRef = useRef<L.Marker>(null)
  const icon = useMemo(
    () => vehicleIcon(vehicle.decision, vehicle.connected, vehicle.position.heading, isSelected),
    [vehicle.decision, vehicle.connected, vehicle.position.heading, isSelected]
  )

  return (
    <Marker
      ref={markerRef as any}
      position={[vehicle.position.lat, vehicle.position.lng]}
      icon={icon}
      eventHandlers={{ click: () => {
        if (isSelected) {
          setSelectedVehicle(null)
          setFollowingVehicle(null)
        } else {
          setSelectedVehicle(vehicle.vehicleId)
        }
      } }}
    >
      <Tooltip permanent={isSelected} direction="top" offset={[0, -20]}
        className="!bg-[#0e0b1e] !border-[rgba(255,255,255,0.12)] !rounded !shadow-none before:!border-t-[#0e0b1e]"
      >
        <div style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.4 }}>
          <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{vehicle.vehicleId}</div>
          <div style={{ color: '#94a3b8' }}>{vehicle.speedKmh.toFixed(0)} km/h</div>
        </div>
      </Tooltip>
    </Marker>
  )
}
