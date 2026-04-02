import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import VehicleMarker from './VehicleMarker'
import GeofenceLayer from './GeofenceLayer'
import GeofenceDrawer from './GeofenceDrawer'
import { useVehiclesStore } from '../../store/vehicles.store'
import { useUIStore } from '../../store/ui.store'

const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194]

export default function MapCanvas() {
  const vehicles = useVehiclesStore((s) => s.vehicles)
  const { isDrawingGeofence } = useUIStore()
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl={false}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <GeofenceLayer />
      {Object.values(vehicles).map((v) => <VehicleMarker key={v.vehicleId} vehicle={v} />)}
      {isDrawingGeofence && <GeofenceDrawer />}
    </MapContainer>
  )
}
