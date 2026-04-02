import { create } from 'zustand'
import type { LatLng } from '../types'

interface UIState {
  selectedVehicleId: string | null
  timelineOpen: boolean
  isDrawingGeofence: boolean
  pendingPolygon: LatLng[] | null
  setSelectedVehicle: (id: string | null) => void
  setTimelineOpen: (open: boolean) => void
  setDrawingGeofence: (drawing: boolean) => void
  setPendingPolygon: (polygon: LatLng[] | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedVehicleId: null,
  timelineOpen: false,
  isDrawingGeofence: false,
  pendingPolygon: null,
  setSelectedVehicle: (id) => set({ selectedVehicleId: id }),
  setTimelineOpen: (open) => set({ timelineOpen: open }),
  setDrawingGeofence: (drawing) => set({ isDrawingGeofence: drawing }),
  setPendingPolygon: (polygon) => set({ pendingPolygon: polygon }),
}))
