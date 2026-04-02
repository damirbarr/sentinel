import { useTimelineStore } from '../../store/timeline.store'
import TimelineItem from './TimelineItem'

export default function EventTimeline() {
  const entries = useTimelineStore((s) => s.entries)
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Event Timeline</h2>
          <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-surface-2 border border-surface-border text-slate-500">{entries.length}</span>
        </div>
        <span className="text-xs text-slate-600">newest first</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-surface-border/50">
        {entries.length === 0
          ? <div className="flex items-center justify-center h-full"><p className="text-xs text-slate-600">Waiting for events…</p></div>
          : entries.map((entry) => <TimelineItem key={entry.id} entry={entry} />)
        }
      </div>
    </div>
  )
}
