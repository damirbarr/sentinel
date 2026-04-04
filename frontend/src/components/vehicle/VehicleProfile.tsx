import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useVehiclesStore } from '../../store/vehicles.store'
import { useEventsStore } from '../../store/events.store'
import { useUIStore } from '../../store/ui.store'
import BrainCanvas from './BrainCanvas'
import AtomCanvas from './AtomCanvas'
import VehicleNarrative from './VehicleNarrative'
import type { DecisionState, ActiveEvent, WeatherPayload, GeofencePayload, NetworkPayload } from '../../types'

function typeClass(type: string) {
  if (type === 'WEATHER') return 'bg-amber-400/20 text-amber-400'
  if (type === 'GEOFENCE') return 'bg-red-400/20 text-red-400'
  return 'bg-orange-400/20 text-orange-400'
}

function constraintLabel(event: ActiveEvent): string {
  if (event.type === 'WEATHER') {
    const p = event.payload as WeatherPayload
    return `${p.condition.replace(/_/g, ' ')} · ${p.severity}`
  }
  if (event.type === 'GEOFENCE') {
    const p = event.payload as GeofencePayload
    return `${p.type}${p.label ? ` · ${p.label}` : ''}`
  }
  const p = event.payload as NetworkPayload
  return `${p.severity}${p.vehicleId ? ` · ${p.vehicleId}` : ' · global'}`
}

const DECISION_COLOR: Record<DecisionState, string> = {
  NORMAL: 'text-cyan-300 border-cyan-400/50 bg-cyan-400/15',
  DEGRADED_SPEED: 'text-amber-200 border-amber-400/50 bg-amber-400/15',
  SAFE_STOP_RECOMMENDED: 'text-red-200 border-red-400/60 bg-red-400/20',
  REROUTE_RECOMMENDED: 'text-orange-200 border-orange-400/50 bg-orange-400/15',
}

const REASON_META: Record<string, { label: string; color: string }> = {
  WEATHER_HEAVY_RAIN:         { label: 'Heavy Rain',    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  WEATHER_FOG:                { label: 'Fog',           color: 'text-amber-300 bg-amber-300/10 border-amber-300/20' },
  WEATHER_STRONG_WIND:        { label: 'Strong Wind',   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  WEATHER_LOW_VISIBILITY:     { label: 'Low Visibility',color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  IN_GEOFENCE_FORBIDDEN_ZONE: { label: 'Forbidden Zone',color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  IN_GEOFENCE_CAUTION_ZONE:   { label: 'Caution Zone',  color: 'text-red-300 bg-red-300/10 border-red-300/20' },
  IN_GEOFENCE_SLOW_ZONE:      { label: 'Slow Zone',     color: 'text-red-300 bg-red-300/10 border-red-300/20' },
  GEOFENCE_AHEAD:             { label: 'Geofence Ahead',color: 'text-red-300 bg-red-300/10 border-red-300/20' },
  NETWORK_POOR:               { label: 'Poor Signal',   color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  NETWORK_LOST:               { label: 'Signal Lost',   color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  MULTI_FACTOR_RISK:          { label: 'Multi-Risk',    color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  PERCEPTION_ALARM:           { label: 'Perception Alarm', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  SENSOR_OBSTACLE_DETECTED:   { label: 'Obstacle Detected', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  SENSOR_FAULT:               { label: 'Sensor Fault', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
}

const REASON_DESCRIPTIONS: Record<string, string> = {
  WEATHER_HEAVY_RAIN:         'Heavy precipitation reducing traction and visibility',
  WEATHER_FOG:                'Dense fog limiting sensor range',
  WEATHER_STRONG_WIND:        'High wind speeds affecting vehicle stability',
  WEATHER_LOW_VISIBILITY:     'Visibility below safe operating threshold',
  IN_GEOFENCE_FORBIDDEN_ZONE: 'Vehicle is inside a forbidden no-go zone',
  IN_GEOFENCE_CAUTION_ZONE:   'Vehicle is inside a caution zone — proceed carefully',
  IN_GEOFENCE_SLOW_ZONE:      'Vehicle is inside a speed-restricted zone',
  GEOFENCE_AHEAD:             'A geofence boundary detected ahead',
  NETWORK_POOR:               'Degraded uplink — telemetry may be delayed',
  NETWORK_LOST:               'No network connectivity — autonomous fallback active',
  MULTI_FACTOR_RISK:          'Multiple simultaneous risk factors detected',
  PERCEPTION_ALARM:           'Operator-triggered perception alarm',
  SENSOR_OBSTACLE_DETECTED:   'Obstacle in path — emergency stop active',
  SENSOR_FAULT:               'Sensor reporting malfunction or unreliable data',
}

function SignalBadge({ code, meta, description }: { code: string; meta: { label: string; color: string }; description: string }) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const spanRef = useRef<HTMLSpanElement>(null)
  return (
    <div className="relative">
      <span
        ref={spanRef}
        onMouseEnter={() => {
          const r = spanRef.current?.getBoundingClientRect()
          if (r) setTooltipPos({ x: r.left + r.width / 2, y: r.top - 6 })
        }}
        onMouseLeave={() => setTooltipPos(null)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold cursor-default ${meta.color}`}
      >
        <span className="w-1 h-1 rounded-full bg-current" />
        {meta.label}
      </span>
      {tooltipPos && createPortal(
        <div style={{
          position: 'fixed',
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: 'translate(-50%, -100%)',
          zIndex: 9999,
          background: 'rgba(7,6,15,0.95)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 10,
          fontFamily: 'monospace',
          color: '#fff',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {description}
        </div>,
        document.body
      )}
    </div>
  )
}

export default function VehicleProfile({ vehicleId }: { vehicleId: string }) {
  const vehicle = useVehiclesStore((s) => s.vehicles[vehicleId])
  const events = useEventsStore((s) => s.events)
  const { settingVizMode, settingAutoRotateBrain, settingShowNearby } = useUIStore()
  const VizCanvas = settingVizMode === 'atom' ? AtomCanvas : BrainCanvas
  const [fullscreen, setFullscreen] = useState(false)
  const [nearbyExpanded, setNearbyExpanded] = useState(settingShowNearby)

  if (!vehicle) return null

  const activeConstraints = vehicle.activeConstraintIds
    .map((id) => events[id])
    .filter(Boolean)

  const affectingConstraints = activeConstraints.filter(e =>
    (vehicle.affectingConstraintIds ?? []).includes(e.id)
  )
  const nearbyConstraints = activeConstraints.filter(e =>
    !(vehicle.affectingConstraintIds ?? []).includes(e.id)
  )

  const weatherConditions = affectingConstraints
    .filter((e) => e.type === 'WEATHER')
    .map((e) => (e.payload as WeatherPayload).condition)

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[2000] bg-surface flex flex-col" style={{ userSelect: 'none' }}>
        {/* Full-viewport brain */}
        <div className="relative flex-1 min-h-0">
          {/* Header bar overlaid on brain */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-3 pb-2 bg-gradient-to-b from-surface/80 to-transparent pointer-events-none">
            <p className="text-[11px] font-bold tracking-[0.25em] text-slate-200 uppercase">Sentinel Cognition</p>
            <button
              onClick={() => setFullscreen(false)}
              className="pointer-events-auto text-slate-400 hover:text-white border border-surface-border hover:border-surface-border-bright rounded px-2 py-1 text-xs font-mono bg-surface/60 backdrop-blur-sm"
            >
              ⊡ EXIT
            </button>
          </div>
          <VizCanvas
            decision={vehicle.decision}
            reasonCodes={vehicle.reasonCodes}
            speedKmh={vehicle.speedKmh}
            activeConstraints={activeConstraints}
            affectingConstraintIds={vehicle.affectingConstraintIds ?? []}
            autoRotate={settingAutoRotateBrain}
            weatherConditions={weatherConditions}
            fullscreen
          />
        </div>

        {/* Info strip below brain — scrollable */}
        <div className="overflow-y-auto scrollbar-thin bg-surface border-t border-surface-border max-h-[40vh]">
          <div className="flex flex-col gap-3 p-4">
            {/* Decision state */}
            <div className={`rounded-md border p-3 ${DECISION_COLOR[vehicle.decision]}`}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-current opacity-70 mb-1">Decision State</p>
              <p className="font-mono font-bold text-base">{vehicle.decision.replace(/_/g, ' ')}</p>
            </div>

            {/* Active signals */}
            {vehicle.reasonCodes.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-2">Active Signals</p>
                <div className="flex flex-wrap gap-1.5">
                  {vehicle.reasonCodes.map((code) => {
                    const meta = REASON_META[code] ?? { label: code, color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' }
                    const description = REASON_DESCRIPTIONS[code] ?? code
                    return (
                      <SignalBadge key={code} code={code} meta={meta} description={description} />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Actively Affecting */}
            {affectingConstraints.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/80 mb-2">⚡ Actively Affecting</p>
                <div className="space-y-1">
                  {affectingConstraints.map((event) => (
                    <div key={event.id} className="flex items-center gap-2 p-2 rounded bg-red-400/5 border border-red-400/20">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${typeClass(event.type)}`}>{event.type}</span>
                      <span className="text-[10px] font-mono text-slate-200 truncate">{constraintLabel(event)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby / Potential */}
            {nearbyConstraints.length > 0 && (
              <div>
                <button
                  onClick={() => setNearbyExpanded(v => !v)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors mb-2 w-full text-left"
                >
                  <span style={{ display: 'inline-block', transition: 'transform 0.15s', transform: nearbyExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  Nearby ({nearbyConstraints.length})
                </button>
                {nearbyExpanded && (
                  <div className="space-y-1">
                    {nearbyConstraints.map((event) => (
                      <div key={event.id} className="flex items-center gap-2 p-2 rounded bg-surface-2 border border-surface-border opacity-60">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold opacity-60 ${typeClass(event.type)}`}>{event.type}</span>
                        <span className="text-[10px] font-mono text-slate-400 truncate">{constraintLabel(event)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Narrative */}
            <VehicleNarrative
              decision={vehicle.decision}
              reasonCodes={vehicle.reasonCodes}
              speedKmh={vehicle.speedKmh}
              connected={vehicle.connected}
            />

            {/* Telemetry */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Speed', value: `${vehicle.speedKmh.toFixed(0)} km/h` },
                { label: 'Heading', value: `${vehicle.position.heading.toFixed(0)}°` },
                { label: 'Latitude', value: vehicle.position.lat.toFixed(5) },
                { label: 'Longitude', value: vehicle.position.lng.toFixed(5) },
              ].map(({ label, value }) => (
                <div key={label} className="p-2.5 rounded-lg bg-surface-2 border border-surface-border">
                  <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
                  <p className="text-xs font-mono font-bold text-slate-100">{value}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-500 text-center pb-1">
              Updated {new Date(vehicle.lastSeenAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 select-none" style={{ userSelect: 'none' }}>
      {/* Brain visualization */}
      <div className="flex flex-col items-center pt-2" style={{ userSelect: 'none' }}>
        <div className="flex items-center justify-between mb-3 w-full">
          <p className="text-[11px] font-bold tracking-[0.25em] text-slate-200 uppercase">
            Sentinel Cognition
          </p>
          <button
            onClick={() => setFullscreen(true)}
            className="text-slate-500 hover:text-slate-300 transition-colors text-[10px] font-mono border border-surface-border hover:border-surface-border-bright rounded px-1.5 py-0.5"
          >
            ⊞ FULL
          </button>
        </div>
        <VizCanvas
          decision={vehicle.decision}
          reasonCodes={vehicle.reasonCodes}
          speedKmh={vehicle.speedKmh}
          activeConstraints={activeConstraints}
          affectingConstraintIds={vehicle.affectingConstraintIds ?? []}
          autoRotate={settingAutoRotateBrain}
          weatherConditions={weatherConditions}
        />
        <div className={`mt-2 w-full rounded-md border p-3 ${DECISION_COLOR[vehicle.decision]}`}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-current opacity-70 mb-1">Decision State</p>
          <p className="font-mono font-bold text-base">{vehicle.decision.replace(/_/g, ' ')}</p>
        </div>
      </div>

      {/* Active signals */}
      {vehicle.reasonCodes.length > 0 && (
        <div style={{ userSelect: 'none' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-2">Active Signals</p>
          <div className="flex flex-wrap gap-1.5">
            {vehicle.reasonCodes.map((code) => {
              const meta = REASON_META[code] ?? { label: code, color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' }
              const description = REASON_DESCRIPTIONS[code] ?? code
              return (
                <SignalBadge key={code} code={code} meta={meta} description={description} />
              )
            })}
          </div>
        </div>
      )}

      {/* Actively Affecting */}
      {affectingConstraints.length > 0 && (
        <div style={{ userSelect: 'none' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/80 mb-2">⚡ Actively Affecting</p>
          <div className="space-y-1">
            {affectingConstraints.map((event) => (
              <div key={event.id} className="flex items-center gap-2 p-2 rounded bg-red-400/5 border border-red-400/20">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${typeClass(event.type)}`}>{event.type}</span>
                <span className="text-[10px] font-mono text-slate-200 truncate">{constraintLabel(event)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby / Potential */}
      {nearbyConstraints.length > 0 && (
        <div style={{ userSelect: 'none' }}>
          <button
            onClick={() => setNearbyExpanded(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors mb-2 w-full text-left"
          >
            <span style={{ display: 'inline-block', transition: 'transform 0.15s', transform: nearbyExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            Nearby ({nearbyConstraints.length})
          </button>
          {nearbyExpanded && (
            <div className="space-y-1">
              {nearbyConstraints.map((event) => (
                <div key={event.id} className="flex items-center gap-2 p-2 rounded bg-surface-2 border border-surface-border opacity-60">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold opacity-60 ${typeClass(event.type)}`}>{event.type}</span>
                  <span className="text-[10px] font-mono text-slate-400 truncate">{constraintLabel(event)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Narrative */}
      <VehicleNarrative
        decision={vehicle.decision}
        reasonCodes={vehicle.reasonCodes}
        speedKmh={vehicle.speedKmh}
        connected={vehicle.connected}
      />

      {/* Telemetry grid */}
      <div className="grid grid-cols-2 gap-2" style={{ userSelect: 'none' }}>
        {[
          { label: 'Speed', value: `${vehicle.speedKmh.toFixed(0)} km/h` },
          { label: 'Heading', value: `${vehicle.position.heading.toFixed(0)}°` },
          { label: 'Latitude', value: vehicle.position.lat.toFixed(5) },
          { label: 'Longitude', value: vehicle.position.lng.toFixed(5) },
        ].map(({ label, value }) => (
          <div key={label} className="p-2.5 rounded-lg bg-surface-2 border border-surface-border">
            <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
            <p className="text-xs font-mono font-bold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-500 text-center">
        Updated {new Date(vehicle.lastSeenAt).toLocaleTimeString()}
      </p>
    </div>
  )
}
