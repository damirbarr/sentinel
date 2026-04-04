import { MapContainer, TileLayer, useMapEvents, useMap, Circle, Polyline } from 'react-leaflet'
import { useEffect, useMemo, memo } from 'react'
import 'leaflet/dist/leaflet.css'
import VehicleMarker from './VehicleMarker'
import GeofenceLayer from './GeofenceLayer'
import GeofenceDrawer from './GeofenceDrawer'
import WeatherOverlay from './WeatherOverlay'
import type { WeatherZone } from './WeatherOverlay'
import { useVehiclesStore, shallow } from '../../store/vehicles.store'
import { useUIStore } from '../../store/ui.store'
import { useEventsStore } from '../../store/events.store'
import type { WeatherPayload } from '../../types'

const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194]

const DECISION_COLORS: Record<string, string> = {
  NORMAL: '#22d3ee',
  DEGRADED_SPEED: '#fcd34d',
  SAFE_STOP_RECOMMENDED: '#fc8181',
  REROUTE_RECOMMENDED: '#fdba74',
}

function TrailLayer() {
  const settingShowTrails = useUIStore((s) => s.settingShowTrails)
  const trails = useVehiclesStore((s) => s.trails)

  if (!settingShowTrails) return null

  return (
    <>
      {Object.values(trails).map((trail) => {
        if (trail.length < 2) return null
        const segments: { points: [number, number][]; decision: string; opacity: number }[] = []
        let segStart = 0
        for (let i = 1; i <= trail.length; i++) {
          if (i === trail.length || trail[i].decision !== trail[i - 1].decision) {
            const midIdx = Math.floor((segStart + i - 1) / 2)
            const opacity = 0.15 + (midIdx / (trail.length - 1)) * 0.65
            segments.push({
              points: trail.slice(segStart, i).map((p) => [p.lat, p.lng]),
              decision: trail[segStart].decision,
              opacity,
            })
            segStart = i - 1
          }
        }
        return segments.map((seg, idx) => (
          <Polyline
            key={`${trail[0].ts}-${idx}`}
            positions={seg.points}
            pathOptions={{
              color: DECISION_COLORS[seg.decision] ?? '#94a3b8',
              weight: 2,
              opacity: seg.opacity,
              fill: false,
            }}
            interactive={false}
          />
        ))
      })}
    </>
  )
}

function WeatherPlacementClickHandler() {
  const { isPlacingWeather, setPendingWeatherCenter, setPlacingWeather, weatherHoverCenter, pendingWeatherRadius, pendingWeatherCenter, setWeatherHoverCenter } = useUIStore()
  useMapEvents({
    mousemove(e) {
      if (isPlacingWeather) {
        setWeatherHoverCenter({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    },
    mouseout() {
      setWeatherHoverCenter(null)
    },
    click(e) {
      if (isPlacingWeather) {
        setPendingWeatherCenter({ lat: e.latlng.lat, lng: e.latlng.lng })
        setPlacingWeather(false)
        setWeatherHoverCenter(null)
      }
    },
  })
  return (
    <>
      {weatherHoverCenter && (
        <Circle
          center={[weatherHoverCenter.lat, weatherHoverCenter.lng]}
          radius={pendingWeatherRadius}
          pathOptions={{
            color: '#fbbf24',
            fillColor: '#fbbf24',
            fillOpacity: 0.08,
            weight: 1,
            dashArray: '4 6',
            opacity: 0.6,
          }}
          interactive={false}
        />
      )}
      {pendingWeatherCenter && (
        <Circle
          center={[pendingWeatherCenter.lat, pendingWeatherCenter.lng]}
          radius={pendingWeatherRadius}
          pathOptions={{
            color: '#fbbf24',
            fillColor: '#fbbf24',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '4 6',
          }}
          interactive={false}
        />
      )}
    </>
  )
}

function FlyToHandler() {
  const map = useMap()
  const { mapFlyTarget, setMapFlyTarget } = useUIStore()

  useEffect(() => {
    if (mapFlyTarget) {
      map.flyTo([mapFlyTarget.lat, mapFlyTarget.lng], mapFlyTarget.zoom ?? 14)
      setMapFlyTarget(null)
    }
  }, [mapFlyTarget, map, setMapFlyTarget])

  return null
}

function VehicleFollowHandler() {
  const map = useMap()
  const followingVehicleId = useUIStore((s) => s.followingVehicleId)
  const setFollowingVehicle = useUIStore((s) => s.setFollowingVehicle)
  const vehicle = useVehiclesStore((s) => followingVehicleId ? s.vehicles[followingVehicleId] : null)

  // Stop following on manual drag
  useEffect(() => {
    const stop = () => setFollowingVehicle(null)
    map.on('dragstart', stop)
    return () => { map.off('dragstart', stop) }
  }, [map, setFollowingVehicle])

  // Pan to followed vehicle on position update
  useEffect(() => {
    if (!vehicle) return
    map.panTo([vehicle.position.lat, vehicle.position.lng], { animate: true, duration: 0.5 })
  }, [vehicle?.position.lat, vehicle?.position.lng, map])

  return null
}

export default function MapCanvas() {
  // Subscribe only to the list of IDs — re-renders only when vehicles join/leave, not on every position update
  const vehicleIds = useVehiclesStore((s) => Object.keys(s.vehicles), shallow)
  const { isDrawingGeofence, isPlacingWeather } = useUIStore()
  const events = useEventsStore((s) => s.events)

  const activeWeatherZones = useMemo<WeatherZone[]>(() =>
    Object.values(events)
      .filter((e) => e.active && e.type === 'WEATHER')
      .map((e) => {
        const p = e.payload as WeatherPayload
        return { condition: p.condition, center: p.center, radiusMeters: p.radiusMeters }
      }),
  [events])

  return (
    <div className={isPlacingWeather ? 'cursor-crosshair w-full h-full relative' : 'w-full h-full relative'}>
      <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
        <GeofenceLayer />
        <TrailLayer />
        {vehicleIds.map((id) => <VehicleMarker key={id} vehicleId={id} />)}
        {isDrawingGeofence && <GeofenceDrawer />}
        <WeatherPlacementClickHandler />
        <FlyToHandler />
        <VehicleFollowHandler />
        <WeatherOverlay weatherZones={activeWeatherZones} />
      </MapContainer>
      {isDrawingGeofence && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-full bg-black/70 border border-sky-400/50 text-xs text-sky-300 font-medium pointer-events-none">
          Click to add points · Double-click to finish
        </div>
      )}
    </div>
  )
}
