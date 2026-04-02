import type { DecisionState } from '../../types'

const CFG: Record<DecisionState, {
  icon: string
  label: string
  sub: string
  outerGlow: string
  innerBg: string
  textColor: string
  pulse: boolean
}> = {
  NORMAL: {
    icon: '●',
    label: 'Normal',
    sub: 'All systems nominal',
    outerGlow: 'shadow-[0_0_32px_rgba(74,222,128,0.3)] ring-2 ring-green-400/40',
    innerBg: 'bg-gradient-to-br from-green-900/60 to-green-950/40',
    textColor: 'text-green-300',
    pulse: false,
  },
  DEGRADED_SPEED: {
    icon: '▼',
    label: 'Degraded Speed',
    sub: 'Speed profile reduced',
    outerGlow: 'shadow-[0_0_32px_rgba(252,211,77,0.3)] ring-2 ring-amber-400/40',
    innerBg: 'bg-gradient-to-br from-amber-900/60 to-amber-950/40',
    textColor: 'text-amber-200',
    pulse: false,
  },
  SAFE_STOP_RECOMMENDED: {
    icon: '⬛',
    label: 'Safe Stop',
    sub: 'Recommend immediate stop',
    outerGlow: 'shadow-[0_0_48px_rgba(252,129,129,0.5)] ring-2 ring-red-400/60',
    innerBg: 'bg-gradient-to-br from-red-900/70 to-red-950/50',
    textColor: 'text-red-200',
    pulse: true,
  },
  REROUTE_RECOMMENDED: {
    icon: '⟳',
    label: 'Reroute',
    sub: 'Alternative route recommended',
    outerGlow: 'shadow-[0_0_32px_rgba(253,186,116,0.3)] ring-2 ring-orange-400/40',
    innerBg: 'bg-gradient-to-br from-orange-900/60 to-orange-950/40',
    textColor: 'text-orange-200',
    pulse: false,
  },
}

export default function DecisionBadge({ decision }: { decision: DecisionState }) {
  const c = CFG[decision]
  return (
    <div className={`w-full flex flex-col items-center gap-3 py-6 px-5 rounded-lg ${c.innerBg} ${c.outerGlow} ${c.pulse ? 'animate-pulse' : ''} text-center relative overflow-hidden`}>
      {/* Subtle inner radial glow */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      <span className={`text-4xl ${c.textColor} relative z-10`}>{c.icon}</span>
      <span className={`text-2xl font-extrabold tracking-wide ${c.textColor} relative z-10`}>{c.label}</span>
      <span className="text-xs text-slate-400 relative z-10">{c.sub}</span>
    </div>
  )
}
