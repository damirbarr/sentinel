import type { DecisionState, ReasonCode } from '../../types'

const DECISION_COLOR: Record<DecisionState, string> = {
  NORMAL: '#06b6d4',
  DEGRADED_SPEED: '#f59e0b',
  SAFE_STOP_RECOMMENDED: '#ef4444',
  REROUTE_RECOMMENDED: '#f97316',
}

const DECISION_LABEL: Record<DecisionState, string> = {
  NORMAL: 'NRM',
  DEGRADED_SPEED: 'DEG',
  SAFE_STOP_RECOMMENDED: 'STP',
  REROUTE_RECOMMENDED: 'RRT',
}

// Sensor nodes: angle in degrees from top (12 o'clock = 0)
const SENSOR_NODES = [
  { id: 'WEATHER', label: 'W', angle: -30, color: '#f59e0b', codes: ['WEATHER_HEAVY_RAIN','WEATHER_FOG','WEATHER_STRONG_WIND','WEATHER_LOW_VISIBILITY'] },
  { id: 'GEOFENCE', label: 'G', angle: 90, color: '#ef4444', codes: ['IN_GEOFENCE_FORBIDDEN_ZONE','IN_GEOFENCE_CAUTION_ZONE','IN_GEOFENCE_SLOW_ZONE','GEOFENCE_AHEAD'] },
  { id: 'NETWORK', label: 'N', angle: 210, color: '#f97316', codes: ['NETWORK_POOR','NETWORK_LOST'] },
  { id: 'MULTI', label: 'M', angle: 330, color: '#a855f7', codes: ['MULTI_FACTOR_RISK'] },
]

function polarToXY(angleDeg: number, radius: number, cx = 150, cy = 150) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 30) * Math.PI / 180
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }).join(' ')
}

interface Props {
  decision: DecisionState
  reasonCodes: ReasonCode[]
  speedKmh: number
}

export default function DigitalBrain({ decision, reasonCodes, speedKmh }: Props) {
  const color = DECISION_COLOR[decision]
  const label = DECISION_LABEL[decision]

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 300" className="w-full max-w-[280px]">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Outer ring - slow rotation */}
        <circle className="animate-spin-slow" cx="150" cy="150" r="130"
          fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.25"
          strokeDasharray="3 12" />

        {/* Middle ring - counter rotation */}
        <circle className="animate-spin-slow-reverse" cx="150" cy="150" r="105"
          fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.2"
          strokeDasharray="2 8" />

        {/* Core glow aura */}
        <circle cx="150" cy="150" r="75" fill="url(#coreGlow)" />

        {/* Inner fill */}
        <circle cx="150" cy="150" r="55" fill="url(#innerGlow)" />

        {/* Sensor nodes + signal lines */}
        {SENSOR_NODES.map((node) => {
          const active = node.codes.some((c) => reasonCodes.includes(c as ReasonCode))
          const pos = polarToXY(node.angle, 108)
          const mid = polarToXY(node.angle, 75)
          const d = `M ${pos.x} ${pos.y} Q ${mid.x} ${mid.y} 150 150`
          return (
            <g key={node.id}>
              {active && (
                <path d={d} fill="none"
                  stroke={node.color} strokeWidth="1.5" strokeOpacity="0.7"
                  strokeDasharray="6 4"
                  className="animate-signal-flow"
                  style={{ animationDelay: `${node.codes.indexOf(node.codes[0]) * 0.3}s` }}
                />
              )}
              <circle cx={pos.x} cy={pos.y} r="14"
                fill={active ? `${node.color}22` : '#0f172a'}
                stroke={active ? node.color : '#334155'}
                strokeWidth={active ? 1.5 : 1}
                filter={active ? 'url(#glow)' : undefined}
              />
              <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
                fontSize="9" fontWeight="bold" fontFamily="monospace"
                fill={active ? node.color : '#475569'}>
                {node.label}
              </text>
            </g>
          )
        })}

        {/* Hexagon core */}
        <polygon points={hexPoints(150, 150, 48)}
          fill="#0a0f1a"
          stroke={color} strokeWidth="1.5"
          filter="url(#glow)"
        />

        {/* Decision label */}
        <text x="150" y="145" textAnchor="middle" fontSize="16" fontWeight="bold"
          fontFamily="monospace" fill={color} filter="url(#glow)">
          {label}
        </text>
        <text x="150" y="162" textAnchor="middle" fontSize="8"
          fontFamily="monospace" fill={color} fillOpacity="0.6">
          {speedKmh.toFixed(0)} km/h
        </text>
      </svg>
    </div>
  )
}
