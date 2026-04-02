import { MapContainer, TileLayer, useMapEvents, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import VehicleMarker from './VehicleMarker'
import GeofenceLayer from './GeofenceLayer'
import GeofenceDrawer from './GeofenceDrawer'
import { useVehiclesStore } from '../../store/vehicles.store'
import { useUIStore } from '../../store/ui.store'

const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194]

function WeatherPlacementClickHandler() {
  const { isPlacingWeather, setPendingWeatherCenter, setPlacingWeather, weatherHoverCenter, pendingWeatherRadius, setWeatherHoverCenter } = useUIStore()
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
  return weatherHoverCenter ? (
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
  ) : null
}

export default function MapCanvas() {
  const vehicles = useVehiclesStore((s) => s.vehicles)
  const { isDrawingGeofence, isPlacingWeather } = useUIStore()
  return (
    <div className={isPlacingWeather ? 'cursor-crosshair w-full h-full relative' : 'w-full h-full relative'}>
      <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
        <GeofenceLayer />
        {Object.values(vehicles).map((v) => <VehicleMarker key={v.vehicleId} vehicle={v} />)}
        {isDrawingGeofence && <GeofenceDrawer />}
        <WeatherPlacementClickHandler />
      </MapContainer>
      {isDrawingGeofence && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-full bg-black/70 border border-sky-400/50 text-xs text-sky-300 font-medium pointer-events-none">
          Click to add points · Double-click to finish
        </div>
      )}
    </div>
  )
}
