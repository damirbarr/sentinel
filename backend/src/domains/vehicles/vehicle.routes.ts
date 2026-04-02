import type { FastifyInstance } from 'fastify'
import type { VehicleService } from './vehicle.service.js'
import type { SentinelClientManager } from '../../ws/sentinel-clients.js'

let vehicleService: VehicleService
let sentinelMgr: SentinelClientManager | null = null

export function initVehicleService(svc: VehicleService): void {
  vehicleService = svc
}

export function initSentinelManager(mgr: SentinelClientManager): void {
  sentinelMgr = mgr
}

export function registerVehicleRoutes(app: FastifyInstance): void {
  app.get('/api/vehicles', async () => vehicleService.getAll())

  app.get('/api/vehicles/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const vehicle = vehicleService.getAll().find((v) => v.vehicleId === id)
    if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found' })
    return vehicle
  })

  app.post('/api/vehicles/:id/command', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { command, payload } = req.body as { command: string; payload?: Record<string, unknown> }
    if (!command) return reply.status(400).send({ error: 'command required' })
    if (!sentinelMgr) return reply.status(503).send({ error: 'Sentinel manager not ready' })
    const sent = sentinelMgr.sendCommand(id, command, payload ?? {})
    if (!sent) return reply.status(404).send({ error: 'Vehicle not connected' })
    return { ok: true, vehicleId: id, command }
  })
}
