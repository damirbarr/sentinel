import { create } from 'zustand'
import type { VehicleStatus } from '../types'

interface VehiclesState {
  vehicles: Record<string, VehicleStatus>
  upsertVehicle: (v: VehicleStatus) => void
  setVehicles: (vs: VehicleStatus[]) => void
  setConnected: (vehicleId: string, connected: boolean) => void
}

export const useVehiclesStore = create<VehiclesState>((set) => ({
  vehicles: {},
  upsertVehicle: (v) => set((s) => ({ vehicles: { ...s.vehicles, [v.vehicleId]: v } })),
  setVehicles: (vs) => set({ vehicles: Object.fromEntries(vs.map((v) => [v.vehicleId, v])) }),
  setConnected: (vehicleId, connected) =>
    set((s) => {
      const v = s.vehicles[vehicleId]
      if (!v) return s
      return { vehicles: { ...s.vehicles, [vehicleId]: { ...v, connected } } }
    }),
}))
