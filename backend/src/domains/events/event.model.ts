import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

export const WeatherSeverity = z.enum(['LOW', 'MODERATE', 'HIGH', 'EXTREME'])
export const NetworkSeverity = z.enum(['DEGRADED', 'UNSTABLE', 'LOST'])
export const GeofenceType = z.enum(['FORBIDDEN', 'CAUTION', 'SLOW'])
export const EventType = z.enum(['WEATHER', 'GEOFENCE', 'NETWORK'])

export const LatLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

export const WeatherPayloadSchema = z.object({
  condition: z.enum(['HEAVY_RAIN', 'FOG', 'STRONG_WIND', 'LOW_VISIBILITY', 'SNOW', 'ICE']),
  severity: WeatherSeverity,
  durationMinutes: z.number().int().positive().optional(),
  description: z.string().optional(),
  center: LatLngSchema.optional(),
  radiusMeters: z.number().min(1000).optional(),
})

export const GeofencePayloadSchema = z.object({
  type: GeofenceType,
  polygon: z.array(LatLngSchema).min(3),
  label: z.string().optional(),
  validUntil: z.string().datetime().optional(),
})

export const NetworkPayloadSchema = z.object({
  severity: NetworkSeverity,
  vehicleId: z.string().optional(),
  description: z.string().optional(),
})

export const CreateEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('WEATHER'), payload: WeatherPayloadSchema }),
  z.object({ type: z.literal('GEOFENCE'), payload: GeofencePayloadSchema }),
  z.object({ type: z.literal('NETWORK'), payload: NetworkPayloadSchema }),
])

export type CreateEventDto = z.infer<typeof CreateEventSchema>
export type LatLng = z.infer<typeof LatLngSchema>
export type WeatherPayload = z.infer<typeof WeatherPayloadSchema>
export type GeofencePayload = z.infer<typeof GeofencePayloadSchema>
export type NetworkPayload = z.infer<typeof NetworkPayloadSchema>

export interface ActiveEvent {
  id: string
  type: 'WEATHER' | 'GEOFENCE' | 'NETWORK'
  payload: WeatherPayload | GeofencePayload | NetworkPayload
  createdAt: string
  clearedAt?: string
  active: boolean
}

export function createActiveEvent(dto: CreateEventDto): ActiveEvent {
  return {
    id: uuidv4(),
    type: dto.type,
    payload: dto.payload,
    createdAt: new Date().toISOString(),
    active: true,
  }
}
