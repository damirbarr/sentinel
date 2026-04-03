// ─── Decisions ───────────────────────────────────────────────────────────────
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
  | 'PERCEPTION_ALARM'
  | 'SENSOR_OBSTACLE_DETECTED'
  | 'SENSOR_FAULT'

// ─── Vehicles ────────────────────────────────────────────────────────────────
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
  affectingConstraintIds: string[]
  lastSeenAt: string
  connected: boolean
}

// ─── Events ──────────────────────────────────────────────────────────────────
export type EventType = 'WEATHER' | 'GEOFENCE' | 'NETWORK'
export type WeatherCondition =
  | 'HEAVY_RAIN' | 'FOG' | 'STRONG_WIND' | 'LOW_VISIBILITY' | 'SNOW' | 'ICE'
export type WeatherSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME'
export type NetworkSeverity = 'DEGRADED' | 'UNSTABLE' | 'LOST'
export type GeofenceType = 'FORBIDDEN' | 'CAUTION' | 'SLOW'

export interface LatLng { lat: number; lng: number }

export interface WeatherPayload {
  condition: WeatherCondition
  severity: WeatherSeverity
  durationMinutes?: number
  description?: string
  center?: LatLng
  radiusMeters?: number
}

export interface GeofencePayload {
  type: GeofenceType
  polygon: LatLng[]
  label?: string
  validUntil?: string
}

export interface NetworkPayload {
  severity: NetworkSeverity
  vehicleId?: string
  description?: string
}

export interface ActiveEvent {
  id: string
  type: EventType
  payload: WeatherPayload | GeofencePayload | NetworkPayload
  createdAt: string
  clearedAt?: string
  active: boolean
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
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

// ─── WebSocket messages (backend → frontend) ──────────────────────────────────
export type ServerMessage =
  | { type: 'INIT_STATE'; vehicles: VehicleStatus[]; events: ActiveEvent[]; timeline: TimelineEntry[] }
  | { type: 'VEHICLE_UPDATE'; vehicle: VehicleStatus }
  | { type: 'EVENT_PUBLISHED'; event: ActiveEvent }
  | { type: 'EVENT_CLEARED'; eventId: string; clearedAt: string }
  | { type: 'TIMELINE_ENTRY'; entry: TimelineEntry }
  | { type: 'VEHICLE_CONNECTED'; vehicleId: string }
  | { type: 'VEHICLE_DISCONNECTED'; vehicleId: string }
