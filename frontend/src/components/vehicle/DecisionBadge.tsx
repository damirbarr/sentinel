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
    outerGlow: 'shadow-[0_0_24px_rgba(52,211,153,0.2)] ring-1 ring-decision-normal/30',
    innerBg: 'bg-gradient-to-br from-decision-normal/20 to-decision-normal/5',
    textColor: 'text-decision-normal',
    pulse: false,
  },
  DEGRADED_SPEED: {
    icon: '▼',
    label: 'Degraded Speed',
    sub: 'Speed profile reduced',
    outerGlow: 'shadow-[0_0_24px_rgba(251,191,36,0.2)] ring-1 ring-decision-degraded/30',
    innerBg: 'bg-gradient-to-br from-decision-degraded/20 to-decision-degraded/5',
    textColor: 'text-decision-degraded',
    pulse: false,
  },
  SAFE_STOP_RECOMMENDED: {
    icon: '⬛',
    label: 'Safe Stop',
    sub: 'Recommend immediate stop',
    outerGlow: 'shadow-[0_0_32px_rgba(248,113,113,0.35)] ring-2 ring-decision-stop/50',
    innerBg: 'bg-gradient-to-br from-decision-stop/25 to-decision-stop/5',
    textColor: 'text-decision-stop',
    pulse: true,
  },
  REROUTE_RECOMMENDED: {
    icon: '⟳',
    label: 'Reroute',
    sub: 'Alternative route recommended',
    outerGlow: 'shadow-[0_0_24px_rgba(251,146,60,0.2)] ring-1 ring-decision-reroute/30',
    innerBg: 'bg-gradient-to-br from-decision-reroute/20 to-decision-reroute/5',
    textColor: 'text-decision-reroute',
    pulse: false,
  },
}

export default function DecisionBadge({ decision }: { decision: DecisionState }) {
  const c = CFG[decision]
  return (
    <div className={`flex flex-col items-center gap-2 py-5 px-4 rounded-2xl ${c.innerBg} ${c.outerGlow} ${c.pulse ? 'animate-pulse' : ''} text-center relative overflow-hidden`}>
      {/* Radial gradient background glow */}
      <div className={`absolute inset-0 rounded-2xl bg-radial-gradient opacity-20 pointer-events-none`} />
      <span className={`text-3xl ${c.textColor} relative z-10`}>{c.icon}</span>
      <span className={`text-base font-extrabold tracking-wide ${c.textColor} relative z-10`}>{c.label}</span>
      <span className="text-xs text-slate-400 relative z-10">{c.sub}</span>
    </div>
  )
}
