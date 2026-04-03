import { useEffect, useRef } from 'react'
import { Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useUIStore } from '../../store/ui.store'
import type { VehicleStatus } from '../../types'

const DECISION_COLORS: Record<string, string> = {
  NORMAL: '#4ade80',
  DEGRADED_SPEED: '#fcd34d',
  SAFE_STOP_RECOMMENDED: '#fc8181',
  REROUTE_RECOMMENDED: '#fdba74',
}

// Core icon is always 40px. When selected, add 14px padding on each side
// for fixed-pixel rings — size never changes with zoom level.
const ICON_R = 16
const BASE_PAD = 4
const SEL_PAD = 16

function vehicleIcon(decision: string, connected: boolean, heading: number, isSelected: boolean): L.DivIcon {
  const color = connected ? (DECISION_COLORS[decision] ?? '#60a5fa') : '#4b5563'
  const pad = isSelected ? SEL_PAD : BASE_PAD
  const total = (ICON_R + pad) * 2
  const c = total / 2

  const selRings = isSelected ? `
    <circle cx="${c}" cy="${c}" r="${c - 4}" stroke="${color}" stroke-width="2.5" fill="none" opacity="0.95"/>
    <circle cx="${c}" cy="${c}" r="${c - 1}" stroke="${color}" stroke-width="1" fill="none" opacity="0.25"/>
  ` : ''

  const svg = `<svg width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" fill="none" xmlns="http://www.w3.org/2000/svg"
    style="transform:rotate(${heading}deg);transform-origin:center;filter:drop-shadow(0 0 6px ${color}88)">
    ${selRings}
    <circle cx="${c}" cy="${c}" r="${ICON_R - 4}" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <path d="M${c} ${c - 9} L${c + 5} ${c + 7} L${c} ${c + 4} L${c - 5} ${c + 7} Z" fill="${color}"/>
  </svg>`

  return L.divIcon({ html: svg, className: '', iconSize: [total, total], iconAnchor: [c, c] })
}

export default function VehicleMarker({ vehicle }: { vehicle: VehicleStatus }) {
  const { setSelectedVehicle, selectedVehicleId, setFollowingVehicle } = useUIStore()
  const isSelected = selectedVehicleId === vehicle.vehicleId
  const markerRef = useRef<L.Marker>(null)
  const transitionTimer = useRef(0)
  const map = useMap()

  // Disable transition during zoom so markers snap to new screen positions
  useEffect(() => {
    const disable = () => {
      clearTimeout(transitionTimer.current)
      const el = markerRef.current?.getElement()
      if (el) el.style.transition = ''
    }
    map.on('zoomstart', disable)
    return () => { map.off('zoomstart', disable) }
  }, [map])

  // Enable transition only for the duration of a position update, then clear it
  useEffect(() => {
    const el = markerRef.current?.getElement()
    if (!el) return
    el.style.transition = 'transform 1.8s linear'
    clearTimeout(transitionTimer.current)
    transitionTimer.current = window.setTimeout(() => {
      const e = markerRef.current?.getElement()
      if (e) e.style.transition = ''
    }, 1850)
  }, [vehicle.position.lat, vehicle.position.lng])

  return (
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
  )
}
