import type { TimelineEntry } from '../../types'
import Badge from '../ui/Badge'
import { formatDistanceToNow } from 'date-fns'

const CAT: Record<string, { label: string; color: 'cyan'|'blue'|'violet'|'amber'|'slate'; dot: string; glow: string }> = {
  OPERATOR_ACTION:   { label: 'Operator',  color: 'cyan',   dot: 'bg-accent-cyan',   glow: 'shadow-[0_0_6px_rgba(34,211,238,0.6)]' },
  BACKEND_EVENT:     { label: 'Backend',   color: 'blue',   dot: 'bg-accent-blue',   glow: 'shadow-[0_0_6px_rgba(56,189,248,0.6)]' },
  SENTINEL_RECEIPT:  { label: 'Receipt',   color: 'violet', dot: 'bg-accent-violet', glow: 'shadow-[0_0_6px_rgba(167,139,250,0.6)]' },
  SENTINEL_DECISION: { label: 'Decision',  color: 'amber',  dot: 'bg-accent-amber',  glow: 'shadow-[0_0_6px_rgba(251,191,36,0.6)]' },
  SENTINEL_REPORT:   { label: 'Report',    color: 'slate',  dot: 'bg-slate-500',     glow: '' },
}

export default function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const cfg = CAT[entry.category] ?? CAT.SENTINEL_REPORT
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-surface-2/60 transition-colors group cursor-default">
      <div className="mt-1.5 shrink-0">
        <span className={`w-2 h-2 rounded-full block ${cfg.dot} ${cfg.glow}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge color={cfg.color}>{cfg.label}</Badge>
          {entry.vehicleId && <span className="text-xs font-mono text-slate-500">{entry.vehicleId}</span>}
          <span className="ml-auto text-xs text-slate-600 shrink-0 font-mono">
            {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
          </span>
        </div>
        <p className="text-xs font-semibold text-white truncate group-hover:text-accent-cyan transition-colors">{entry.title}</p>
        <p className="text-xs text-slate-500 truncate">{entry.detail}</p>
      </div>
    </div>
  )
}
