import type { ActiveEvent, VehicleStatus } from '../types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Request failed')
  }
  return res.json()
}

export const api = {
  getEvents: () => request<ActiveEvent[]>('/events'),
  getVehicles: () => request<VehicleStatus[]>('/vehicles'),
  publishEvent: (body: object) =>
    request<ActiveEvent>('/events', { method: 'POST', body: JSON.stringify(body) }),
  clearEvent: (id: string) =>
    request<ActiveEvent>(`/events/${id}`, { method: 'DELETE' }),
}
