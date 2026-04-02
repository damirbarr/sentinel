import type { WebSocket } from 'ws'
import type { WebSocketServer } from 'ws'
import type { Broadcaster } from '../broadcast/broadcaster.js'

export class SentinelClientManager {
  constructor(_wss: WebSocketServer, _broadcaster: Broadcaster) {}

  pushConstraints(_constraints: object[], _targetVehicleId?: string): void {}

  getSentinelIds(): string[] { return [] }
}
