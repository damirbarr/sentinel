import type { CreateEventDto, ActiveEvent } from './event.model.js'
import { createActiveEvent } from './event.model.js'
import type { EventStore } from './event.store.js'
import type { TimelineStore } from '../timeline/timeline.store.js'
import { makeTimelineEntry } from '../timeline/timeline.model.js'
import type { Broadcaster } from '../../broadcast/broadcaster.js'
import type { SentinelClientManager } from '../../ws/sentinel-clients.js'
import { eventStore } from './event.store.js'
import { timelineStore } from '../timeline/timeline.store.js'

export class EventService {
  private sentinelMgr?: SentinelClientManager

  constructor(
    private eventStore: EventStore,
    private timelineStore: TimelineStore,
    private broadcaster: Broadcaster,
  ) {}

  setSentinelManager(mgr: SentinelClientManager): void {
    this.sentinelMgr = mgr
  }

  publish(dto: CreateEventDto): ActiveEvent {
    const event = createActiveEvent(dto)
    this.eventStore.add(event)
    const entry = makeTimelineEntry({
      category: 'OPERATOR_ACTION',
      eventId: event.id,
      title: `${event.type} event published`,
      detail: `Operator published a ${event.type.toLowerCase()} event`,
    })
    this.timelineStore.add(entry)
    this.broadcaster.broadcast({ type: 'EVENT_PUBLISHED', event })
    this.broadcaster.broadcast({ type: 'TIMELINE_ENTRY', entry })
    this.sentinelMgr?.pushConstraints(this.eventStore.getActive())
    return event
  }

  clear(id: string): ActiveEvent | undefined {
    const clearedAt = new Date().toISOString()
    const event = this.eventStore.clear(id, clearedAt)
    if (!event) return undefined
    const entry = makeTimelineEntry({
      category: 'OPERATOR_ACTION',
      eventId: id,
      title: `${event.type} event cleared`,
      detail: `Operator cleared event ${id}`,
    })
    this.timelineStore.add(entry)
    this.broadcaster.broadcast({ type: 'EVENT_CLEARED', eventId: id, clearedAt })
    this.broadcaster.broadcast({ type: 'TIMELINE_ENTRY', entry })
    this.sentinelMgr?.pushConstraints(this.eventStore.getActive())
    return event
  }

  getAll(): ActiveEvent[] { return this.eventStore.getAll() }
  getActive(): ActiveEvent[] { return this.eventStore.getActive() }
}

let _instance: EventService | null = null
export function getEventServiceInstance(broadcaster?: Broadcaster): EventService {
  if (!_instance && broadcaster) _instance = new EventService(eventStore, timelineStore, broadcaster)
  if (!_instance) throw new Error('EventService not initialized')
  return _instance
}
