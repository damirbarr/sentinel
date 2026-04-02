import type { TimelineEntry } from '../../types'
import Badge from '../ui/Badge'
import { formatDistanceToNow } from 'date-fns'

const CAT: Record<string, { label: string; color: 'cyan'|'blue'|'violet'|'amber'|'slate'; dot: string }> = {
  OPERATOR_ACTION:   { label: 'Operator',  color: 'cyan',   dot: 'bg-accent-cyan' },
  BACKEND_EVENT:     { label: 'Backend',   color: 'blue',   dot: 'bg-accent-blue' },
  SENTINEL_RECEIPT:  { label: 'Receipt',   color: 'violet', dot: 'bg-accent-violet' },
  SENTINEL_DECISION: { label: 'Decision',  color: 'amber',  dot: 'bg-accent-amber' },
  SENTINEL_REPORT:   { label: 'Report',    color: 'slate',  dot: 'bg-slate-500' },
}

export default function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const cfg = CAT[entry.category] ?? CAT.SENTINEL_REPORT
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-surface-2/50 transition-colors">
      <div className="mt-1.5 shrink-0"><span className={`w-2 h-2 rounded-full block ${cfg.dot}`} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge color={cfg.color}>{cfg.label}</Badge>
          {entry.vehicleId && <span className="text-xs font-mono text-slate-500">{entry.vehicleId}</span>}
          <span className="ml-auto text-xs text-slate-600 shrink-0">{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
        </div>
        <p className="text-xs font-medium text-white truncate">{entry.title}</p>
        <p className="text-xs text-slate-500 truncate">{entry.detail}</p>
      </div>
    </div>
  )
}
