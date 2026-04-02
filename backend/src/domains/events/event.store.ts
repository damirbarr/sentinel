import type { ActiveEvent } from './event.model.js'

export class EventStore {
  private events = new Map<string, ActiveEvent>()
  add(event: ActiveEvent): void { this.events.set(event.id, event) }
  get(id: string): ActiveEvent | undefined { return this.events.get(id) }
  getAll(): ActiveEvent[] { return Array.from(this.events.values()) }
  getActive(): ActiveEvent[] { return this.getAll().filter((e) => e.active) }
  clear(id: string, clearedAt: string): ActiveEvent | undefined {
    const event = this.events.get(id)
    if (!event) return undefined
    const updated = { ...event, active: false, clearedAt }
    this.events.set(id, updated)
    return updated
  }
}
export const eventStore = new EventStore()
