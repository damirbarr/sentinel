import type { VehicleStatus } from './vehicle.model.js'

export class VehicleStore {
  private vehicles = new Map<string, VehicleStatus>()
  upsert(status: VehicleStatus): void { this.vehicles.set(status.vehicleId, status) }
  get(vehicleId: string): VehicleStatus | undefined { return this.vehicles.get(vehicleId) }
  getAll(): VehicleStatus[] { return Array.from(this.vehicles.values()) }
  setConnected(vehicleId: string, connected: boolean): void {
    const v = this.vehicles.get(vehicleId)
    if (v) this.vehicles.set(vehicleId, { ...v, connected })
  }
}
export const vehicleStore = new VehicleStore()
