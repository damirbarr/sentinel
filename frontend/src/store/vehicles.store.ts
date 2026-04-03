import { create } from 'zustand'
import type { VehicleStatus } from '../types'

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
  setVehicles: (vs: VehicleStatus[]) => void
  setConnected: (vehicleId: string, connected: boolean) => void
  appendTrail: (vehicleId: string, lat: number, lng: number, decision: string) => void
}

export const useVehiclesStore = create<VehiclesState>((set) => ({
  vehicles: {},
  trails: {},
  upsertVehicle: (v) => set((s) => ({ vehicles: { ...s.vehicles, [v.vehicleId]: v } })),
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
      const next = [...prev, { lat, lng, decision, ts: now }].filter((p) => now - p.ts <= 60000)
      return { trails: { ...s.trails, [vehicleId]: next } }
    }),
}))
