import { useEffect, useRef } from 'react'
import { Marker, Tooltip, Circle } from 'react-leaflet'
import L from 'leaflet'
import { useUIStore } from '../../store/ui.store'
import type { VehicleStatus } from '../../types'

const DECISION_COLORS: Record<string, string> = {
  NORMAL: '#4ade80',
  DEGRADED_SPEED: '#fcd34d',
  SAFE_STOP_RECOMMENDED: '#fc8181',
  REROUTE_RECOMMENDED: '#fdba74',
}

function vehicleIcon(decision: string, connected: boolean, heading: number, isSelected: boolean): L.DivIcon {
  const color = connected ? (DECISION_COLORS[decision] ?? '#60a5fa') : '#4b5563'
  const size = isSelected ? 48 : 40

  // Drop shadow / glow filter
  const filterId = `glow-${decision.toLowerCase().replace(/_/g, '-')}`
  const selectionRing = isSelected
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" stroke="${color}" stroke-width="1.5" stroke-dasharray="3 2" fill="none" opacity="0.6" class="animate-ping"/>`
    : ''

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg"
    style="transform:rotate(${heading}deg);transform-origin:center;filter:drop-shadow(0 0 6px ${color}88)">
    <defs>
      <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${color}" flood-opacity="0.5"/>
      </filter>
    </defs>
    ${isSelected ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" stroke="${color}" stroke-width="1" fill="none" opacity="0.3"/>` : ''}
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="${color}22" stroke="${color}" stroke-width="2" filter="url(#${filterId})"/>
    <path d="M${size / 2} ${size / 2 - 9} L${size / 2 + 5} ${size / 2 + 7} L${size / 2} ${size / 2 + 4} L${size / 2 - 5} ${size / 2 + 7} Z" fill="${color}" filter="url(#${filterId})"/>
  </svg>`

  return L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

export default function VehicleMarker({ vehicle }: { vehicle: VehicleStatus }) {
  const { setSelectedVehicle, selectedVehicleId, setFollowingVehicle } = useUIStore()
  const isSelected = selectedVehicleId === vehicle.vehicleId
  const markerRef = useRef<L.Marker>(null)

  // Apply CSS transition to the marker's DOM element so it glides visually
  // while Leaflet's internal _latlng stays at the true position — hit-testing
  // always works correctly regardless of where the icon is animating to.
  useEffect(() => {
    const el = markerRef.current?.getElement()
    if (el) el.style.transition = 'transform 1.8s linear'
  })

  return (
    <>
      <Marker
        ref={markerRef as any}
        position={[vehicle.position.lat, vehicle.position.lng]}
        icon={vehicleIcon(vehicle.decision, vehicle.connected, vehicle.position.heading, isSelected)}
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
      {isSelected && (
        <Circle
          center={[vehicle.position.lat, vehicle.position.lng]}
          radius={60}
          pathOptions={{
            color: DECISION_COLORS[vehicle.decision] ?? '#60a5fa',
            fillColor: DECISION_COLORS[vehicle.decision] ?? '#60a5fa',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '4 3',
          }}
          interactive={false}
        />
      )}
    </>
  )
}
