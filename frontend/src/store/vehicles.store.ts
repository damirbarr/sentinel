import { create } from 'zustand'
import { shallow } from 'zustand/shallow'
import type { VehicleStatus } from '../types'

export { shallow }

interface TrailPoint {
  lat: number
  lng: number
  decision: string
  ts: number
}

interface VehiclesState {
  vehicles: Record<string, VehicleStatus>
  trails: Record<string, TrailPoint[]>
  upsertVehicle: (v: VehicleStatus) => void
  patchVehicles: (vs: VehicleStatus[]) => void
  setVehicles: (vs: VehicleStatus[]) => void
  setConnected: (vehicleId: string, connected: boolean) => void
  appendTrail: (vehicleId: string, lat: number, lng: number, decision: string) => void
}

export const useVehiclesStore = create<VehiclesState>((set) => ({
  vehicles: {},
  trails: {},
  upsertVehicle: (v) => set((s) => ({ vehicles: { ...s.vehicles, [v.vehicleId]: v } })),
  patchVehicles: (vs) => set((s) => ({ vehicles: { ...s.vehicles, ...Object.fromEntries(vs.map((v) => [v.vehicleId, v])) } })),
  setVehicles: (vs) => set({ vehicles: Object.fromEntries(vs.map((v) => [v.vehicleId, v])) }),
  setConnected: (vehicleId, connected) =>
    set((s) => {
      const v = s.vehicles[vehicleId]
      if (!v) return s
      return { vehicles: { ...s.vehicles, [vehicleId]: { ...v, connected } } }
    }),
  appendTrail: (vehicleId, lat, lng, decision) =>
    set((s) => {
      const now = Date.now()
      const prev = s.trails[vehicleId] ?? []
      const last = prev[prev.length - 1]
      // Throttle: skip if last point was less than 2s ago
      if (last && now - last.ts < 2000) return s
      const trimmed = prev.filter((p) => now - p.ts <= 60000)
      // Cap at 30 points (2s interval × 30 = 60s coverage)
      const capped = trimmed.length >= 30 ? trimmed.slice(-29) : trimmed
      return { trails: { ...s.trails, [vehicleId]: [...capped, { lat, lng, decision, ts: now }] } }
    }),
}))
