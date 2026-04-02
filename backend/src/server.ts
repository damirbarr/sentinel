import Fastify from 'fastify'

const MOCK_SIMULATOR_HTML = '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>Sentinel \u2014 Mock Simulator</title>\n' +
'<style>\n' +
'  * { box-sizing: border-box; margin: 0; padding: 0; }\n' +
'  body {\n' +
'    background: radial-gradient(ellipse at 20% 0%, #1a0a3a 0%, #07060f 60%);\n' +
'    min-height: 100vh;\n' +
'    color: #e2e8f0;\n' +
'    font-family: \'JetBrains Mono\', \'Courier New\', monospace;\n' +
'    padding: 32px 24px;\n' +
'  }\n' +
'  h1 { font-size: 14px; letter-spacing: 0.3em; color: #94a3b8; margin-bottom: 4px; }\n' +
'  .subtitle { font-size: 11px; color: #475569; margin-bottom: 32px; }\n' +
'  .vehicle-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }\n' +
'  .vehicle-card {\n' +
'    background: rgba(255,255,255,0.04);\n' +
'    border: 1px solid #1c2740;\n' +
'    border-radius: 12px;\n' +
'    padding: 16px;\n' +
'  }\n' +
'  .vehicle-id { font-size: 13px; font-weight: bold; color: #22d3ee; margin-bottom: 4px; }\n' +
'  .vehicle-status { font-size: 10px; color: #64748b; margin-bottom: 12px; }\n' +
'  .decision-badge {\n' +
'    display: inline-block;\n' +
'    padding: 2px 8px;\n' +
'    border-radius: 20px;\n' +
'    font-size: 10px;\n' +
'    font-weight: bold;\n' +
'    margin-bottom: 12px;\n' +
'  }\n' +
'  .NORMAL { background: rgba(74,222,128,0.15); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }\n' +
'  .DEGRADED_SPEED { background: rgba(252,211,77,0.15); color: #fcd34d; border: 1px solid rgba(252,211,77,0.3); }\n' +
'  .SAFE_STOP_RECOMMENDED { background: rgba(252,129,129,0.2); color: #fc8181; border: 1px solid rgba(252,129,129,0.4); }\n' +
'  .REROUTE_RECOMMENDED { background: rgba(253,186,116,0.15); color: #fdba74; border: 1px solid rgba(253,186,116,0.3); }\n' +
'  .cmd-group { display: flex; flex-direction: column; gap: 6px; }\n' +
'  .cmd-btn {\n' +
'    background: transparent;\n' +
'    border: 1px solid #2a2550;\n' +
'    border-radius: 8px;\n' +
'    padding: 8px 12px;\n' +
'    font-family: inherit;\n' +
'    font-size: 11px;\n' +
'    font-weight: 600;\n' +
'    cursor: pointer;\n' +
'    text-align: left;\n' +
'    transition: all 0.15s;\n' +
'    display: flex; align-items: center; gap: 8px;\n' +
'  }\n' +
'  .cmd-btn:hover { background: rgba(255,255,255,0.06); border-color: #3d3680; }\n' +
'  .cmd-btn.danger { color: #fc8181; border-color: rgba(252,129,129,0.3); }\n' +
'  .cmd-btn.danger:hover { background: rgba(252,129,129,0.08); }\n' +
'  .cmd-btn.warn { color: #fcd34d; border-color: rgba(252,211,77,0.3); }\n' +
'  .cmd-btn.warn:hover { background: rgba(252,211,77,0.08); }\n' +
'  .cmd-btn.clear { color: #4ade80; border-color: rgba(74,222,128,0.3); }\n' +
'  .cmd-btn.clear:hover { background: rgba(74,222,128,0.08); }\n' +
'  .perception-row { display: flex; gap: 6px; }\n' +
'  .perception-input {\n' +
'    flex: 1; background: rgba(255,255,255,0.05); border: 1px solid #2a2550;\n' +
'    border-radius: 6px; padding: 6px 10px; color: #e2e8f0; font-family: inherit;\n' +
'    font-size: 10px; outline: none;\n' +
'  }\n' +
'  .perception-input:focus { border-color: #a78bfa; }\n' +
'  .perception-btn {\n' +
'    background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.3);\n' +
'    border-radius: 6px; padding: 6px 10px; color: #c084fc; font-family: inherit;\n' +
'    font-size: 10px; font-weight: 600; cursor: pointer; white-space: nowrap;\n' +
'  }\n' +
'  .perception-btn:hover { background: rgba(167,139,250,0.2); }\n' +
'  .flash { animation: flash 0.4s ease-out; }\n' +
'  @keyframes flash { 0% { border-color: #22d3ee; } 100% { border-color: #1c2740; } }\n' +
'  .empty { color: #334155; font-size: 12px; text-align: center; padding: 48px; }\n' +
'  .refresh-btn {\n' +
'    background: transparent; border: 1px solid #2a2550; border-radius: 6px;\n' +
'    padding: 4px 12px; color: #64748b; font-family: inherit; font-size: 10px;\n' +
'    cursor: pointer; margin-left: 12px;\n' +
'  }\n' +
'  .refresh-btn:hover { color: #94a3b8; border-color: #3d3680; }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'<h1>SENTINEL MOCK SIMULATOR</h1>\n' +
'<p class="subtitle">Simulate vehicle-originated events for connected mocks <button class="refresh-btn" onclick="load()">\u27f3 Refresh</button></p>\n' +
'<div class="vehicle-grid" id="grid"><p class="empty">Loading vehicles\u2026</p></div>\n' +
'<script>\n' +
'async function sendCommand(vehicleId, command, payload) {\n' +
'  payload = payload || {};\n' +
'  var card = document.getElementById("card-" + vehicleId);\n' +
'  if (card) { card.classList.add("flash"); setTimeout(function(){ card.classList.remove("flash"); }, 400); }\n' +
'  await fetch("/api/vehicles/" + vehicleId + "/command", {\n' +
'    method: "POST",\n' +
'    headers: { "Content-Type": "application/json" },\n' +
'    body: JSON.stringify({ command: command, payload: payload }),\n' +
'  });\n' +
'  setTimeout(load, 800);\n' +
'}\n' +
'\n' +
'async function load() {\n' +
'  var res = await fetch("/api/vehicles");\n' +
'  var vehicles = await res.json();\n' +
'  var grid = document.getElementById("grid");\n' +
'  if (!vehicles.length) { grid.innerHTML = "<p class=\\"empty\\">No vehicles connected</p>"; return; }\n' +
'  grid.innerHTML = vehicles.map(function(v) {\n' +
'    var dec = v.decision.replace(/_/g," ");\n' +
'    var signals = v.reasonCodes.length ? v.reasonCodes.join(", ") : "no active signals";\n' +
'    return "<div class=\\"vehicle-card\\" id=\\"card-" + v.vehicleId + "\\">" +\n' +
'      "<div class=\\"vehicle-id\\">" + v.vehicleId + "</div>" +\n' +
'      "<div class=\\"decision-badge " + v.decision + "\\">" + dec + "</div>" +\n' +
'      "<div class=\\"vehicle-status\\">" + v.speedKmh.toFixed(0) + " km/h \u00b7 " + signals + "</div>" +\n' +
'      "<div class=\\"cmd-group\\">" +\n' +
'        "<div class=\\"perception-row\\">" +\n' +
'          "<input class=\\"perception-input\\" id=\\"pmsg-" + v.vehicleId + "\\" placeholder=\\"Perception alarm message\\u2026\\" />" +\n' +
'          "<button class=\\"perception-btn\\" onclick=\\"sendCommand(\'" + v.vehicleId + "\',\'SIMULATE_PERCEPTION_ALARM\',{message:document.getElementById(\'pmsg-" + v.vehicleId + "\').value||\'Perception fault\'})\\">\\ud83d\\udc41 Alarm</button>" +\n' +
'        "</div>" +\n' +
'        "<button class=\\"cmd-btn warn\\" onclick=\\"sendCommand(\'" + v.vehicleId + "\',\'SIMULATE_NETWORK_DEGRADED\')\\">\\ud83d\\udce6 Network Degraded</button>" +\n' +
'        "<button class=\\"cmd-btn danger\\" onclick=\\"sendCommand(\'" + v.vehicleId + "\',\'SIMULATE_NETWORK_LOST\')\\">\\ud83d\\udcf5 Network Lost</button>" +\n' +
'        "<button class=\\"cmd-btn danger\\" onclick=\\"sendCommand(\'" + v.vehicleId + "\',\'SIMULATE_OBSTACLE_DETECTED\')\\">\\ud83d\\udea7 Obstacle Detected</button>" +\n' +
'        "<button class=\\"cmd-btn warn\\" onclick=\\"sendCommand(\'" + v.vehicleId + "\',\'SIMULATE_SENSOR_FAULT\')\\">\\u26a0\\ufe0f Sensor Fault</button>" +\n' +
'        "<button class=\\"cmd-btn clear\\" onclick=\\"sendCommand(\'" + v.vehicleId + "\',\'CLEAR_SIMULATION\')\\">\\u2713 Clear All</button>" +\n' +
'      "</div>" +\n' +
'    "</div>";\n' +
'  }).join("");\n' +
'}\n' +
'\n' +
'load();\n' +
'setInterval(load, 5000);\n' +
'</script>\n' +
'</body>\n' +
'</html>\n'

import cors from '@fastify/cors'
import { IncomingMessage, Server as HttpServer, ServerResponse } from 'http'
import { WebSocketServer } from 'ws'
import { config } from './config.js'
import { FrontendClientManager } from './ws/frontend-clients.js'
import { SentinelClientManager } from './ws/sentinel-clients.js'
import { Broadcaster } from './broadcast/broadcaster.js'
import { registerEventRoutes, initEventService } from './domains/events/event.routes.js'
import { registerVehicleRoutes, initVehicleService, initSentinelManager } from './domains/vehicles/vehicle.routes.js'
import { getVehicleService } from './domains/vehicles/vehicle.service.js'

export async function buildServer() {
  const app = Fastify({ logger: { level: 'info' } })
  await app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok' }))

  app.get('/mock-simulator', async (req, reply) => {
    reply.type('text/html').send(MOCK_SIMULATOR_HTML)
  })

  const httpServer: HttpServer<typeof IncomingMessage, typeof ServerResponse> = app.server
  const clientWss = new WebSocketServer({ noServer: true })
  const sentinelWss = new WebSocketServer({ noServer: true })
  const broadcaster = new Broadcaster(clientWss)

  initEventService(broadcaster)
  const vehicleService = getVehicleService(broadcaster)
  initVehicleService(vehicleService)

  registerEventRoutes(app)
  registerVehicleRoutes(app)

  httpServer.on('upgrade', (req, socket, head) => {
    const url = req.url ?? ''
    if (url.startsWith(config.clientWsPath)) {
      clientWss.handleUpgrade(req, socket, head, (ws) => clientWss.emit('connection', ws, req))
    } else if (url.startsWith(config.sentinelWsPath)) {
      sentinelWss.handleUpgrade(req, socket, head, (ws) => sentinelWss.emit('connection', ws, req))
    } else {
      socket.destroy()
    }
  })

  const frontendMgr = new FrontendClientManager(clientWss, broadcaster)
  const sentinelMgr = new SentinelClientManager(sentinelWss, broadcaster)

  initSentinelManager(sentinelMgr)

  // Allow EventService to push constraints to connected sentinels
  const { getEventService } = await import('./domains/events/event.routes.js')
  getEventService().setSentinelManager(sentinelMgr)

  return { app, broadcaster, frontendMgr, sentinelMgr }
}
