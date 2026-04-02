import type { WebSocket as WsSocket } from 'ws'
import { WebSocket, WebSocketServer } from 'ws'

export class Broadcaster {
  constructor(private wss: WebSocketServer) {}

  broadcast(msg: object): void {
    const json = JSON.stringify(msg)
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json)
      }
    })
  }

  broadcastTo(ws: WsSocket, msg: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  sendInitState(ws: WsSocket, vehicles: object[], events: object[], timeline: object[]): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'INIT_STATE', vehicles, events, timeline }))
    }
  }
}
