import type { VehicleStatus, SentinelStatusPayload, SentinelEventPayload } from './vehicle.model.js'
import type { VehicleStore } from './vehicle.store.js'
import type { TimelineStore } from '../timeline/timeline.store.js'
import { makeTimelineEntry } from '../timeline/timeline.model.js'
import type { Broadcaster } from '../../broadcast/broadcaster.js'
import { vehicleStore } from './vehicle.store.js'
import { timelineStore } from '../timeline/timeline.store.js'

export class VehicleService {
  constructor(
    private vehicleStore: VehicleStore,
    private timelineStore: TimelineStore,
    private broadcaster: Broadcaster,
  ) {}

  register(vehicleId: string, position: VehicleStatus['position']): VehicleStatus {
    const existing = this.vehicleStore.get(vehicleId)
    const status: VehicleStatus = existing
      ? { ...existing, connected: true, lastSeenAt: new Date().toISOString() }
      : { vehicleId, position, speedKmh: 0, decision: 'NORMAL', reasonCodes: [], activeConstraintIds: [], lastSeenAt: new Date().toISOString(), connected: true }
    this.vehicleStore.upsert(status)
    const entry = makeTimelineEntry({ category: 'SENTINEL_RECEIPT', vehicleId, title: `${vehicleId} connected`, detail: `Registered at (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})` })
    this.timelineStore.add(entry)
    this.broadcaster.broadcast({ type: 'VEHICLE_CONNECTED', vehicleId })
    this.broadcaster.broadcast({ type: 'TIMELINE_ENTRY', entry })
    this.broadcaster.broadcast({ type: 'VEHICLE_UPDATE', vehicle: status })
    return status
  }

  handleStatusUpdate(vehicleId: string, payload: SentinelStatusPayload): void {
    const existing = this.vehicleStore.get(vehicleId)
    if (!existing) return
    const prevDecision = existing.decision
    const status: VehicleStatus = { ...existing, ...payload, vehicleId, connected: true, lastSeenAt: new Date().toISOString() }
    this.vehicleStore.upsert(status)
    this.broadcaster.broadcast({ type: 'VEHICLE_UPDATE', vehicle: status })
    if (prevDecision !== payload.decision) {
      const entry = makeTimelineEntry({ category: 'SENTINEL_DECISION', vehicleId, title: `${vehicleId} decision changed`, detail: `${prevDecision} → ${payload.decision}`, decision: payload.decision, reasonCodes: payload.reasonCodes })
      this.timelineStore.add(entry)
      this.broadcaster.broadcast({ type: 'TIMELINE_ENTRY', entry })
    }
  }

  handleEventReport(vehicleId: string, payload: SentinelEventPayload): void {
    const entry = makeTimelineEntry({ category: 'SENTINEL_REPORT', vehicleId, title: `${vehicleId}: ${payload.event}`, detail: payload.description, decision: payload.newDecision, reasonCodes: payload.reasonCodes })
    this.timelineStore.add(entry)
    this.broadcaster.broadcast({ type: 'TIMELINE_ENTRY', entry })
  }

  disconnect(vehicleId: string): void {
    this.vehicleStore.setConnected(vehicleId, false)
    const v = this.vehicleStore.get(vehicleId)
    if (v) this.broadcaster.broadcast({ type: 'VEHICLE_UPDATE', vehicle: { ...v, connected: false } })
    const entry = makeTimelineEntry({ category: 'SENTINEL_REPORT', vehicleId, title: `${vehicleId} disconnected`, detail: `Sentinel mock lost connection` })
    this.timelineStore.add(entry)
    this.broadcaster.broadcast({ type: 'VEHICLE_DISCONNECTED', vehicleId })
    this.broadcaster.broadcast({ type: 'TIMELINE_ENTRY', entry })
  }

  getAll(): VehicleStatus[] { return this.vehicleStore.getAll() }
}

let _instance: VehicleService | null = null
export function getVehicleService(broadcaster: Broadcaster): VehicleService {
  if (!_instance) _instance = new VehicleService(vehicleStore, timelineStore, broadcaster)
  return _instance
}
