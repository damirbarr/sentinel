import { create } from 'zustand'
import type { TimelineEntry } from '../types'

interface TimelineState {
  entries: TimelineEntry[]
  setEntries: (entries: TimelineEntry[]) => void
  addEntry: (entry: TimelineEntry) => void
}

export const useTimelineStore = create<TimelineState>((set) => ({
  entries: [],
  setEntries: (entries) => set({ entries }),
  addEntry: (entry) => set((s) => ({ entries: [entry, ...s.entries].slice(0, 300) })),
}))
