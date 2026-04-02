import { WebSocket, WebSocketServer } from 'ws'
import type { Broadcaster } from '../broadcast/broadcaster.js'
import { getVehicleService } from '../domains/vehicles/vehicle.service.js'
import { eventStore } from '../domains/events/event.store.js'
import { timelineStore } from '../domains/timeline/timeline.store.js'
import { makeTimelineEntry } from '../domains/timeline/timeline.model.js'
import type {
  SentinelStatusMessage,
  SentinelRegisterPayload,
  SentinelStatusPayload,
  SentinelEventPayload,
} from '../domains/vehicles/vehicle.model.js'

export class SentinelClientManager {
  private sentinels = new Map<string, WebSocket>()

  constructor(private wss: WebSocketServer, private broadcaster: Broadcaster) {
    wss.on('connection', (ws: WebSocket, req) => {
      let vehicleId: string | null = null
      const ip = req.socket.remoteAddress ?? 'unknown'
      console.log(`[Sentinel WS] Mock connected from ${ip}`)

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString()) as SentinelStatusMessage

          if (msg.type === 'REGISTER') {
            vehicleId = msg.vehicleId
            this.sentinels.set(vehicleId, ws)
            console.log(`[Sentinel WS] ${vehicleId} registered`)

            const payload = msg.payload as SentinelRegisterPayload
            const svc = getVehicleService(broadcaster)
            svc.register(vehicleId, payload.position)

            // Deliver current active constraints to the newly connected sentinel
            const activeConstraints = eventStore.getActive()
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'CONSTRAINT_UPDATE', constraints: activeConstraints }))
            }

            if (activeConstraints.length > 0) {
              const entry = makeTimelineEntry({
                category: 'SENTINEL_RECEIPT',
                vehicleId,
                title: `${vehicleId} received ${activeConstraints.length} active constraint(s)`,
                detail: `Delivered ${activeConstraints.length} constraint(s) on connect`,
              })
              timelineStore.add(entry)
              broadcaster.broadcast({ type: 'TIMELINE_ENTRY', entry })
            }
          } else if (msg.type === 'STATUS_UPDATE') {
            getVehicleService(broadcaster).handleStatusUpdate(
              msg.vehicleId,
              msg.payload as SentinelStatusPayload
            )
          } else if (msg.type === 'EVENT_REPORT') {
            getVehicleService(broadcaster).handleEventReport(
              msg.vehicleId,
              msg.payload as SentinelEventPayload
            )
          } else {
            console.warn(`[Sentinel WS] Unknown message type: ${(msg as any).type}`)
          }
        } catch (err) {
          console.error('[Sentinel WS] Failed to parse message:', err)
        }
      })

      ws.on('close', () => {
        console.log(`[Sentinel WS] ${vehicleId ?? 'unknown'} disconnected`)
        if (vehicleId) {
          this.sentinels.delete(vehicleId)
          getVehicleService(broadcaster).disconnect(vehicleId)
        }
      })

      ws.on('error', (err) => console.error('[Sentinel WS] Error:', err.message))
    })
  }

  pushConstraints(constraints: object[], targetVehicleId?: string): void {
    const msg = JSON.stringify({ type: 'CONSTRAINT_UPDATE', constraints })
    if (targetVehicleId) {
      const ws = this.sentinels.get(targetVehicleId)
      if (ws?.readyState === WebSocket.OPEN) ws.send(msg)
    } else {
      this.sentinels.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg)
      })
    }
  }

  getSentinelIds(): string[] {
    return Array.from(this.sentinels.keys())
  }
}
