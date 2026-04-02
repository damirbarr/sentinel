import type { WebSocketServer } from 'ws'
import type { Broadcaster } from '../broadcast/broadcaster.js'

export class FrontendClientManager {
  constructor(_wss: WebSocketServer, _broadcaster: Broadcaster) {}
}
