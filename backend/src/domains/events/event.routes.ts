import type { FastifyInstance } from 'fastify'
import { CreateEventSchema } from './event.model.js'
import { EventService, getEventServiceInstance } from './event.service.js'
import type { Broadcaster } from '../../broadcast/broadcaster.js'

export function initEventService(broadcaster: Broadcaster): void {
  getEventServiceInstance(broadcaster)
}

export function getEventService(): EventService {
  return getEventServiceInstance()
}

export function registerEventRoutes(app: FastifyInstance): void {
  app.get('/api/events', async () => getEventServiceInstance().getAll())

  app.post('/api/events', async (req, reply) => {
    const parsed = CreateEventSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    return reply.status(201).send(getEventServiceInstance().publish(parsed.data))
  })

  app.delete('/api/events/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const cleared = getEventServiceInstance().clear(id)
    if (!cleared) return reply.status(404).send({ error: 'Event not found' })
    return cleared
  })
}
