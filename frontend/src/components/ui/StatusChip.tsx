import clsx from 'clsx'
import type { DecisionState } from '../../types'

const CONFIG: Record<DecisionState, { label: string; classes: string; dot: string; glow: string }> = {
  NORMAL: {
    label: 'Normal',
    classes: 'bg-gradient-to-r from-decision-normal/20 to-decision-normal/10 text-decision-normal border-decision-normal/40',
    dot: 'bg-decision-normal',
    glow: 'shadow-[0_0_8px_rgba(52,211,153,0.3)]',
  },
  DEGRADED_SPEED: {
    label: 'Degraded Speed',
    classes: 'bg-gradient-to-r from-decision-degraded/20 to-decision-degraded/10 text-decision-degraded border-decision-degraded/40',
    dot: 'bg-decision-degraded',
    glow: 'shadow-[0_0_8px_rgba(251,191,36,0.3)]',
  },
  SAFE_STOP_RECOMMENDED: {
    label: 'Safe Stop',
    classes: 'bg-gradient-to-r from-decision-stop/20 to-decision-stop/10 text-decision-stop border-decision-stop/50 animate-pulse',
    dot: 'bg-decision-stop',
    glow: 'shadow-[0_0_10px_rgba(248,113,113,0.4)]',
  },
  REROUTE_RECOMMENDED: {
    label: 'Reroute',
    classes: 'bg-gradient-to-r from-decision-reroute/20 to-decision-reroute/10 text-decision-reroute border-decision-reroute/40',
    dot: 'bg-decision-reroute',
    glow: 'shadow-[0_0_8px_rgba(251,146,60,0.3)]',
  },
}

export default function StatusChip({ decision, size = 'md' }: { decision: DecisionState; size?: 'sm' | 'md' }) {
  const cfg = CONFIG[decision]
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full border font-semibold',
      cfg.classes,
      cfg.glow,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
