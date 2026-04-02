import type { DecisionState } from '../../types'

const CFG: Record<DecisionState, { icon: string; label: string; sub: string; ring: string; bg: string; text: string }> = {
  NORMAL:                { icon: '●', label: 'Normal',        sub: 'All systems nominal',          ring: 'ring-decision-normal/40',   bg: 'bg-decision-normal/10',   text: 'text-decision-normal' },
  DEGRADED_SPEED:        { icon: '▼', label: 'Degraded Speed', sub: 'Speed profile reduced',       ring: 'ring-decision-degraded/40', bg: 'bg-decision-degraded/10', text: 'text-decision-degraded' },
  SAFE_STOP_RECOMMENDED: { icon: '⬛', label: 'Safe Stop',     sub: 'Recommend immediate stop',    ring: 'ring-decision-stop/50 ring-2 ring-offset-1 ring-offset-surface-1', bg: 'bg-decision-stop/10', text: 'text-decision-stop' },
  REROUTE_RECOMMENDED:   { icon: '⟳', label: 'Reroute',       sub: 'Alternative route recommended', ring: 'ring-decision-reroute/40', bg: 'bg-decision-reroute/10', text: 'text-decision-reroute' },
}

export default function DecisionBadge({ decision }: { decision: DecisionState }) {
  const c = CFG[decision]
  return (
    <div className={`flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl ${c.bg} ring-1 ${c.ring} text-center`}>
      <span className={`text-2xl ${c.text}`}>{c.icon}</span>
      <span className={`text-sm font-bold ${c.text}`}>{c.label}</span>
      <span className="text-xs text-slate-500">{c.sub}</span>
    </div>
  )
}
