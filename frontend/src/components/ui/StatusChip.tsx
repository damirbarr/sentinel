import clsx from 'clsx'
import type { DecisionState } from '../../types'

const CONFIG: Record<DecisionState, { label: string; classes: string; dot: string; glow: string }> = {
  NORMAL: {
    label: 'Normal',
    classes: 'bg-gradient-to-r from-green-900/50 to-green-800/30 border border-green-400/40 text-green-300',
    dot: 'bg-green-400',
    glow: 'border-glow-green',
  },
  DEGRADED_SPEED: {
    label: 'Degraded Speed',
    classes: 'bg-gradient-to-r from-amber-900/50 to-amber-800/30 border border-amber-400/40 text-amber-200',
    dot: 'bg-amber-400',
    glow: 'border-glow-amber',
  },
  SAFE_STOP_RECOMMENDED: {
    label: 'Safe Stop',
    classes: 'bg-gradient-to-r from-red-900/60 to-red-800/40 border border-red-400/50 text-red-200 animate-pulse',
    dot: 'bg-red-400',
    glow: 'border-glow-red',
  },
  REROUTE_RECOMMENDED: {
    label: 'Reroute',
    classes: 'bg-gradient-to-r from-orange-900/50 to-orange-800/30 border border-orange-400/40 text-orange-200',
    dot: 'bg-orange-400',
    glow: 'border-glow-amber',
  },
}

export default function StatusChip({ decision, size = 'md' }: { decision: DecisionState; size?: 'sm' | 'md' }) {
  const cfg = CONFIG[decision]
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full font-semibold',
      cfg.classes,
      cfg.glow,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
