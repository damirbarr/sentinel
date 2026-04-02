import { useTimelineStore } from '../../store/timeline.store'
import TimelineItem from './TimelineItem'

export default function EventTimeline() {
  const entries = useTimelineStore((s) => s.entries)
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border shrink-0 bg-gradient-to-r from-surface-1 to-surface">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest gradient-text">Event Timeline</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-surface-2 border border-accent-cyan/20 text-accent-cyan border-glow-cyan">
            {entries.length}
          </span>
        </div>
        <span className="text-xs text-slate-600 font-mono">newest first</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-surface-border/30">
        {entries.length === 0
          ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <span className="text-2xl text-surface-border-bright">◌</span>
              <p className="text-xs text-slate-600">Waiting for events…</p>
            </div>
          )
          : entries.map((entry) => <TimelineItem key={entry.id} entry={entry} />)
        }
      </div>
    </div>
  )
}
