import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import '@geoman-io/leaflet-geoman-free'
import { useUIStore } from '../../store/ui.store'
import type L from 'leaflet'

export default function GeofenceDrawer() {
  const map = useMap()
  const { setDrawingGeofence, setPendingPolygon } = useUIStore()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pm = (map as any).pm
    pm.addControls({
      position: 'topleft',
      drawMarker: false, drawCircleMarker: false, drawPolyline: false,
      drawRectangle: false, drawPolygon: true, drawCircle: false,
      editMode: false, dragMode: false, cutPolygon: false, removalMode: false,
    })
    pm.setGlobalOptions({
      pathOptions: { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 2 },
    })

    const handleCreate = (e: any) => {
      const layer = e.layer as L.Polygon
      const latLngs = (layer.getLatLngs()[0] as L.LatLng[]).map((ll) => ({ lat: ll.lat, lng: ll.lng }))
      setPendingPolygon(latLngs)
      map.removeLayer(layer)
      setDrawingGeofence(false)
      pm.disableDraw()
      pm.removeControls()
    }

    map.on('pm:create', handleCreate)
    pm.enableDraw('Polygon')

    return () => {
      pm.removeControls()
      map.off('pm:create', handleCreate)
      try { pm.disableDraw() } catch {}
    }
  }, [map, setDrawingGeofence, setPendingPolygon])

  return null
}
