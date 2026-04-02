export type DecisionState =
  | 'NORMAL'
  | 'DEGRADED_SPEED'
  | 'SAFE_STOP_RECOMMENDED'
  | 'REROUTE_RECOMMENDED'

export type ReasonCode =
  | 'WEATHER_HEAVY_RAIN'
  | 'WEATHER_LOW_VISIBILITY'
  | 'WEATHER_STRONG_WIND'
  | 'WEATHER_FOG'
  | 'GEOFENCE_AHEAD'
  | 'IN_GEOFENCE_FORBIDDEN_ZONE'
  | 'IN_GEOFENCE_SLOW_ZONE'
  | 'IN_GEOFENCE_CAUTION_ZONE'
  | 'NETWORK_POOR'
  | 'NETWORK_LOST'
  | 'MULTI_FACTOR_RISK'

export interface VehiclePosition {
  lat: number
  lng: number
  heading: number
}

export interface VehicleStatus {
  vehicleId: string
  position: VehiclePosition
  speedKmh: number
  decision: DecisionState
  reasonCodes: ReasonCode[]
  activeConstraintIds: string[]
  lastSeenAt: string
  connected: boolean
}

export interface SentinelStatusMessage {
  type: 'REGISTER' | 'STATUS_UPDATE' | 'EVENT_REPORT'
  vehicleId: string
  payload: SentinelRegisterPayload | SentinelStatusPayload | SentinelEventPayload
}

export interface SentinelRegisterPayload {
  vehicleId: string
  position: VehiclePosition
}

export interface SentinelStatusPayload {
  position: VehiclePosition
  speedKmh: number
  decision: DecisionState
  reasonCodes: ReasonCode[]
  activeConstraintIds: string[]
}

export interface SentinelEventPayload {
  event: string
  previousDecision: DecisionState
  newDecision: DecisionState
  reasonCodes: ReasonCode[]
  description: string
}
