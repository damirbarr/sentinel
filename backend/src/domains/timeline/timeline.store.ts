import type { TimelineEntry } from './timeline.model.js'

const MAX_ENTRIES = 500

export class TimelineStore {
  private entries: TimelineEntry[] = []
  add(entry: TimelineEntry): void {
    this.entries.unshift(entry)
    if (this.entries.length > MAX_ENTRIES) this.entries = this.entries.slice(0, MAX_ENTRIES)
  }
  getAll(): TimelineEntry[] { return [...this.entries] }
  getRecent(n: number): TimelineEntry[] { return this.entries.slice(0, n) }
}
export const timelineStore = new TimelineStore()
