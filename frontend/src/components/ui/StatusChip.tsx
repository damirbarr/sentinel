import clsx from 'clsx'
import type { DecisionState } from '../../types'

const CONFIG: Record<DecisionState, { label: string; classes: string; dot: string }> = {
  NORMAL:                  { label: 'Normal',        classes: 'bg-decision-normal/10 text-decision-normal border-decision-normal/30',     dot: 'bg-decision-normal' },
  DEGRADED_SPEED:          { label: 'Degraded Speed', classes: 'bg-decision-degraded/10 text-decision-degraded border-decision-degraded/30', dot: 'bg-decision-degraded' },
  SAFE_STOP_RECOMMENDED:   { label: 'Safe Stop',      classes: 'bg-decision-stop/10 text-decision-stop border-decision-stop/30',           dot: 'bg-decision-stop animate-pulse' },
  REROUTE_RECOMMENDED:     { label: 'Reroute',        classes: 'bg-decision-reroute/10 text-decision-reroute border-decision-reroute/30',  dot: 'bg-decision-reroute' },
}

export default function StatusChip({ decision, size = 'md' }: { decision: DecisionState; size?: 'sm' | 'md' }) {
  const cfg = CONFIG[decision]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full border font-medium', cfg.classes, size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs')}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
