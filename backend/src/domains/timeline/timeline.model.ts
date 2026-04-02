import { v4 as uuidv4 } from 'uuid'
import type { DecisionState, ReasonCode } from '../vehicles/vehicle.model.js'

export type TimelineCategory =
  | 'OPERATOR_ACTION'
  | 'BACKEND_EVENT'
  | 'SENTINEL_RECEIPT'
  | 'SENTINEL_DECISION'
  | 'SENTINEL_REPORT'

export interface TimelineEntry {
  id: string
  timestamp: string
  category: TimelineCategory
  vehicleId?: string
  eventId?: string
  title: string
  detail: string
  decision?: DecisionState
  reasonCodes?: ReasonCode[]
}

export function makeTimelineEntry(
  fields: Omit<TimelineEntry, 'id' | 'timestamp'>
): TimelineEntry {
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...fields,
  }
}
