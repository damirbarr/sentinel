import { useCallback } from 'react'
import { wsClient } from '../api/ws'
import { useVehiclesStore } from '../store/vehicles.store'
import { useEventsStore } from '../store/events.store'
import { useTimelineStore } from '../store/timeline.store'
import type { ServerMessage, VehicleStatus } from '../types'

export function useWebSocket() {
  const { patchVehicles, setVehicles, setConnected, appendTrail } = useVehiclesStore()
  const { addEvent, setEvents, clearEvent } = useEventsStore()
  const { addEntry, setEntries } = useTimelineStore()

  const connect = useCallback(() => {
    // Batch pending vehicle updates — flushed once per animation frame
    const pending = new Map<string, VehicleStatus>()
    let rafId = 0

    function flush() {
      rafId = 0
      if (pending.size === 0) return
      const updates = Array.from(pending.values())
      pending.clear()
      patchVehicles(updates)
      // Append trails for all batched vehicles (throttled inside appendTrail)
      for (const v of updates) {
        appendTrail(v.vehicleId, v.position.lat, v.position.lng, v.decision)
      }
    }

    wsClient.subscribe((msg: ServerMessage) => {
      switch (msg.type) {
        case 'INIT_STATE':
          setVehicles(msg.vehicles)
          setEvents(msg.events)
          setEntries(msg.timeline)
          break
        case 'VEHICLE_UPDATE':
          pending.set(msg.vehicle.vehicleId, msg.vehicle)
          if (!rafId) rafId = requestAnimationFrame(flush)
          break
        case 'EVENT_PUBLISHED': addEvent(msg.event); break
        case 'EVENT_CLEARED': clearEvent(msg.eventId, msg.clearedAt); break
        case 'TIMELINE_ENTRY': addEntry(msg.entry); break
        case 'VEHICLE_CONNECTED': setConnected(msg.vehicleId, true); break
        case 'VEHICLE_DISCONNECTED': setConnected(msg.vehicleId, false); break
      }
    })
    wsClient.connect()
  }, [patchVehicles, setVehicles, setConnected, appendTrail, addEvent, setEvents, clearEvent, addEntry, setEntries])

  return connect
}
