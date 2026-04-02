import { useCallback } from 'react'
import { wsClient } from '../api/ws'
import { useVehiclesStore } from '../store/vehicles.store'
import { useEventsStore } from '../store/events.store'
import { useTimelineStore } from '../store/timeline.store'
import type { ServerMessage } from '../types'

export function useWebSocket() {
  const { upsertVehicle, setVehicles, setConnected } = useVehiclesStore()
  const { addEvent, setEvents, clearEvent } = useEventsStore()
  const { addEntry, setEntries } = useTimelineStore()

  const connect = useCallback(() => {
    wsClient.subscribe((msg: ServerMessage) => {
      switch (msg.type) {
        case 'INIT_STATE':
          setVehicles(msg.vehicles)
          setEvents(msg.events)
          setEntries(msg.timeline)
          break
        case 'VEHICLE_UPDATE': upsertVehicle(msg.vehicle); break
        case 'EVENT_PUBLISHED': addEvent(msg.event); break
        case 'EVENT_CLEARED': clearEvent(msg.eventId, msg.clearedAt); break
        case 'TIMELINE_ENTRY': addEntry(msg.entry); break
        case 'VEHICLE_CONNECTED': setConnected(msg.vehicleId, true); break
        case 'VEHICLE_DISCONNECTED': setConnected(msg.vehicleId, false); break
      }
    })
    wsClient.connect()
  }, [upsertVehicle, setVehicles, setConnected, addEvent, setEvents, clearEvent, addEntry, setEntries])

  return connect
}
