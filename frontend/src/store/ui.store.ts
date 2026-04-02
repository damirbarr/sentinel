import { create } from 'zustand'
import type { LatLng } from '../types'

interface UIState {
  selectedVehicleId: string | null
  timelineOpen: boolean
  isDrawingGeofence: boolean
  pendingPolygon: LatLng[] | null
  isPlacingWeather: boolean
  pendingWeatherCenter: LatLng | null
  pendingWeatherRadius: number
  setSelectedVehicle: (id: string | null) => void
  setTimelineOpen: (open: boolean) => void
  setDrawingGeofence: (drawing: boolean) => void
  setPendingPolygon: (polygon: LatLng[] | null) => void
  setPlacingWeather: (placing: boolean) => void
  setPendingWeatherCenter: (center: LatLng | null) => void
  setPendingWeatherRadius: (radius: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedVehicleId: null,
  timelineOpen: false,
  isDrawingGeofence: false,
  pendingPolygon: null,
  isPlacingWeather: false,
  pendingWeatherCenter: null,
  pendingWeatherRadius: 2000,
  setSelectedVehicle: (id) => set({ selectedVehicleId: id }),
  setTimelineOpen: (open) => set({ timelineOpen: open }),
  setDrawingGeofence: (drawing) => set({ isDrawingGeofence: drawing }),
  setPendingPolygon: (polygon) => set({ pendingPolygon: polygon }),
  setPlacingWeather: (placing) => set({ isPlacingWeather: placing }),
  setPendingWeatherCenter: (center) => set({ pendingWeatherCenter: center }),
  setPendingWeatherRadius: (radius) => set({ pendingWeatherRadius: radius }),
}))
