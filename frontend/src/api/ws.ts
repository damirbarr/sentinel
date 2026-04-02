import type { ServerMessage } from '../types'

type MessageHandler = (msg: ServerMessage) => void
let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const handlers = new Set<MessageHandler>()

const WS_URL = `ws://${window.location.hostname}:3001/ws/clients`

function connect() {
  if (ws && ws.readyState <= WebSocket.OPEN) return
  ws = new WebSocket(WS_URL)
  ws.onopen = () => {
    console.log('[WS] Connected')
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  }
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as ServerMessage
      handlers.forEach((h) => h(msg))
    } catch { console.warn('[WS] Parse error', e.data) }
  }
  ws.onclose = () => {
    ws = null
    reconnectTimer = setTimeout(connect, 3000)
  }
  ws.onerror = (e) => console.error('[WS] Error', e)
}

function subscribe(handler: MessageHandler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export const wsClient = { connect, subscribe }
