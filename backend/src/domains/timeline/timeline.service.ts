import { timelineStore } from './timeline.store.js'

export function getRecentTimeline(n = 100) {
  return timelineStore.getRecent(n)
}

export function getAllTimeline() {
  return timelineStore.getAll()
}
