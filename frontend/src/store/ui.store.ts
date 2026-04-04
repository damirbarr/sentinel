import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LatLng } from '../types'

interface UIState {
  selectedVehicleId: string | null
  timelineOpen: boolean
  isDrawingGeofence: boolean
  pendingPolygon: LatLng[] | null
  isPlacingWeather: boolean
  pendingWeatherCenter: LatLng | null
  pendingWeatherRadius: number
  weatherHoverCenter: LatLng | null
  highlightedConstraintId: string | null
  mapFlyTarget: { lat: number; lng: number; zoom?: number } | null
  settingsOpen: boolean
  settingMaxConstraintDistance: number
  settingSpeedDegradationPct: number
  settingAutoRotateBrain: boolean
  settingVizMode: 'brain' | 'atom'
  settingShowTrails: boolean
  settingShowNearby: boolean
  followingVehicleId: string | null
  setSelectedVehicle: (id: string | null) => void
  setTimelineOpen: (open: boolean) => void
  setDrawingGeofence: (drawing: boolean) => void
  setPendingPolygon: (polygon: LatLng[] | null) => void
  setPlacingWeather: (placing: boolean) => void
  setPendingWeatherCenter: (center: LatLng | null) => void
  setPendingWeatherRadius: (radius: number) => void
  setWeatherHoverCenter: (center: LatLng | null) => void
  setHighlightedConstraintId: (id: string | null) => void
  setMapFlyTarget: (target: { lat: number; lng: number; zoom?: number } | null) => void
  toggleSettings: () => void
  setSettingMaxConstraintDistance: (v: number) => void
  setSettingSpeedDegradationPct: (v: number) => void
  setSettingAutoRotateBrain: (v: boolean) => void
  setSettingVizMode: (v: 'brain' | 'atom') => void
  setSettingShowTrails: (v: boolean) => void
  setSettingShowNearby: (v: boolean) => void
  setFollowingVehicle: (id: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      selectedVehicleId: null,
      timelineOpen: false,
      isDrawingGeofence: false,
      pendingPolygon: null,
      isPlacingWeather: false,
      pendingWeatherCenter: null,
      pendingWeatherRadius: 2000,
      weatherHoverCenter: null,
      highlightedConstraintId: null,
      mapFlyTarget: null,
      settingsOpen: false,
      settingMaxConstraintDistance: 0,
      settingSpeedDegradationPct: 25,
      settingAutoRotateBrain: true,
      settingVizMode: 'brain' as 'brain' | 'atom',
      settingShowTrails: true,
      settingShowNearby: false,
      followingVehicleId: null,
      setSelectedVehicle: (id) => set({ selectedVehicleId: id }),
      setTimelineOpen: (open) => set({ timelineOpen: open }),
      setDrawingGeofence: (drawing) => set({ isDrawingGeofence: drawing }),
      setPendingPolygon: (polygon) => set({ pendingPolygon: polygon }),
      setPlacingWeather: (placing) => set({ isPlacingWeather: placing }),
      setPendingWeatherCenter: (center) => set({ pendingWeatherCenter: center }),
      setPendingWeatherRadius: (radius) => set({ pendingWeatherRadius: radius }),
      setWeatherHoverCenter: (center) => set({ weatherHoverCenter: center }),
      setHighlightedConstraintId: (id) => set({ highlightedConstraintId: id }),
      setMapFlyTarget: (target) => set({ mapFlyTarget: target }),
      toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
      setSettingMaxConstraintDistance: (v) => set({ settingMaxConstraintDistance: v }),
      setSettingSpeedDegradationPct: (v) => set({ settingSpeedDegradationPct: v }),
      setSettingAutoRotateBrain: (v) => set({ settingAutoRotateBrain: v }),
      setSettingVizMode: (v) => set({ settingVizMode: v }),
      setSettingShowTrails: (v) => set({ settingShowTrails: v }),
      setSettingShowNearby: (v) => set({ settingShowNearby: v }),
      setFollowingVehicle: (id) => set({ followingVehicleId: id }),
    }),
    {
      name: 'sentinel-settings',
      partialize: (state) => ({
        settingMaxConstraintDistance: state.settingMaxConstraintDistance,
        settingSpeedDegradationPct: state.settingSpeedDegradationPct,
        settingAutoRotateBrain: state.settingAutoRotateBrain,
        settingVizMode: state.settingVizMode,
        settingShowTrails: state.settingShowTrails,
        settingShowNearby: state.settingShowNearby,
      }),
    }
  )
)
