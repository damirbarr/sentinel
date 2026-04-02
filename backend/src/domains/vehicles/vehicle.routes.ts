import type { FastifyInstance } from 'fastify'
import type { VehicleService } from './vehicle.service.js'

let vehicleService: VehicleService

export function initVehicleService(svc: VehicleService): void {
  vehicleService = svc
}

export function registerVehicleRoutes(app: FastifyInstance): void {
  app.get('/api/vehicles', async () => vehicleService.getAll())

  app.get('/api/vehicles/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const vehicle = vehicleService.getAll().find((v) => v.vehicleId === id)
    if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found' })
    return vehicle
  })
}
