import { WebSocket, WebSocketServer } from 'ws'
import type { Broadcaster } from '../broadcast/broadcaster.js'
import { eventStore } from '../domains/events/event.store.js'
import { vehicleStore } from '../domains/vehicles/vehicle.store.js'
import { timelineStore } from '../domains/timeline/timeline.store.js'

export class FrontendClientManager {
  constructor(wss: WebSocketServer, broadcaster: Broadcaster) {
    wss.on('connection', (ws: WebSocket, req) => {
      const ip = req.socket.remoteAddress ?? 'unknown'
      console.log(`[Frontend WS] Client connected from ${ip}`)

      // Send full state snapshot immediately on connect
      broadcaster.sendInitState(
        ws,
        vehicleStore.getAll(),
        eventStore.getAll(),
        timelineStore.getRecent(100)
      )

      ws.on('error', (err) => console.error('[Frontend WS] Error:', err.message))
      ws.on('close', () => console.log(`[Frontend WS] Client disconnected from ${ip}`))
    })
  }
}
