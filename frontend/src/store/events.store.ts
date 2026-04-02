import { create } from 'zustand'
import type { ActiveEvent } from '../types'

interface EventsState {
  events: Record<string, ActiveEvent>
  setEvents: (events: ActiveEvent[]) => void
  addEvent: (event: ActiveEvent) => void
  clearEvent: (id: string, clearedAt: string) => void
}

export const useEventsStore = create<EventsState>((set) => ({
  events: {},
  setEvents: (events) => set({ events: Object.fromEntries(events.map((e) => [e.id, e])) }),
  addEvent: (event) => set((s) => ({ events: { ...s.events, [event.id]: event } })),
  clearEvent: (id, clearedAt) =>
    set((s) => {
      const e = s.events[id]
      if (!e) return s
      return { events: { ...s.events, [id]: { ...e, active: false, clearedAt } } }
    }),
}))
