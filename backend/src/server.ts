import Fastify from 'fastify'
import cors from '@fastify/cors'
import { IncomingMessage, Server as HttpServer, ServerResponse } from 'http'
import { WebSocketServer } from 'ws'
import { config } from './config.js'
import { FrontendClientManager } from './ws/frontend-clients.js'
import { SentinelClientManager } from './ws/sentinel-clients.js'
import { Broadcaster } from './broadcast/broadcaster.js'
import { registerEventRoutes, initEventService } from './domains/events/event.routes.js'
import { registerVehicleRoutes, initVehicleService } from './domains/vehicles/vehicle.routes.js'
import { getVehicleService } from './domains/vehicles/vehicle.service.js'

export async function buildServer() {
  const app = Fastify({ logger: { level: 'info' } })
  await app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok' }))

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

  // Allow EventService to push constraints to connected sentinels
  const { getEventService } = await import('./domains/events/event.routes.js')
  getEventService().setSentinelManager(sentinelMgr)

  return { app, broadcaster, frontendMgr, sentinelMgr }
}
