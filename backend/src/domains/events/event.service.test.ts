import { describe, it, expect, beforeEach } from 'vitest'
import { EventService } from './event.service.js'
import { EventStore } from './event.store.js'
import { TimelineStore } from '../timeline/timeline.store.js'

// Minimal broadcaster mock
const mockBroadcaster = { broadcast: () => {}, broadcastTo: () => {}, sendInitState: () => {} } as any

function makeService() {
  return new EventService(new EventStore(), new TimelineStore(), mockBroadcaster)
}

describe('EventService', () => {
  it('publishes a weather event and returns it with active=true', () => {
    const svc = makeService()
    const event = svc.publish({
      type: 'WEATHER',
      payload: { condition: 'HEAVY_RAIN', severity: 'HIGH' },
    })
    expect(event.type).toBe('WEATHER')
    expect(event.active).toBe(true)
    expect(event.id).toBeTruthy()
    expect(event.createdAt).toBeTruthy()
  })

  it('publishes a geofence event', () => {
    const svc = makeService()
    const event = svc.publish({
      type: 'GEOFENCE',
      payload: {
        type: 'FORBIDDEN',
        polygon: [
          { lat: 37.7, lng: -122.4 },
          { lat: 37.8, lng: -122.4 },
          { lat: 37.8, lng: -122.3 },
        ],
      },
    })
    expect(event.type).toBe('GEOFENCE')
    expect(event.active).toBe(true)
  })

  it('publishes a network event', () => {
    const svc = makeService()
    const event = svc.publish({
      type: 'NETWORK',
      payload: { severity: 'LOST', vehicleId: 'vehicle-001' },
    })
    expect(event.type).toBe('NETWORK')
    expect(event.active).toBe(true)
  })

  it('getAll returns all published events', () => {
    const svc = makeService()
    svc.publish({ type: 'WEATHER', payload: { condition: 'FOG', severity: 'LOW' } })
    svc.publish({ type: 'NETWORK', payload: { severity: 'DEGRADED' } })
    expect(svc.getAll()).toHaveLength(2)
  })

  it('getActive returns only active events', () => {
    const svc = makeService()
    const e1 = svc.publish({ type: 'WEATHER', payload: { condition: 'FOG', severity: 'LOW' } })
    svc.publish({ type: 'NETWORK', payload: { severity: 'DEGRADED' } })
    svc.clear(e1.id)
    expect(svc.getActive()).toHaveLength(1)
  })

  it('clears an event by id', () => {
    const svc = makeService()
    const event = svc.publish({ type: 'WEATHER', payload: { condition: 'FOG', severity: 'MODERATE' } })
    const cleared = svc.clear(event.id)
    expect(cleared?.active).toBe(false)
    expect(cleared?.clearedAt).toBeTruthy()
  })

  it('returns undefined when clearing non-existent event', () => {
    const svc = makeService()
    expect(svc.clear('nonexistent')).toBeUndefined()
  })
})
