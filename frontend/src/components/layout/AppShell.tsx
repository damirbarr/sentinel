import Header from './Header'
import MapCanvas from '../map/MapCanvas'
import ControlPanel from '../control/ControlPanel'
import VehiclePanel from '../vehicle/VehiclePanel'
import EventTimeline from '../timeline/EventTimeline'
import { useUIStore } from '../../store/ui.store'

export default function AppShell() {
  const { selectedVehicleId, timelineOpen, setTimelineOpen } = useUIStore()
  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left panel with vertical gradient */}
        <div className="w-72 shrink-0 flex flex-col bg-gradient-to-b from-surface-1 to-surface border-r border-surface-border overflow-y-auto scrollbar-thin z-10">
          <ControlPanel />
        </div>
        <div className="flex-1 relative overflow-hidden">
          <MapCanvas />
          {/* Timeline toggle — pill with glowing border + gradient text */}
          <button
            onClick={() => setTimelineOpen(!timelineOpen)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-5 py-2 rounded-full bg-surface-2/90 backdrop-blur-sm border border-surface-border-bright border-glow-cyan text-xs font-semibold hover:border-accent-cyan/50 transition-all shadow-panel"
          >
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-ping-subtle" />
            <span className="gradient-text">{timelineOpen ? 'Hide' : 'Show'} Event Timeline</span>
          </button>
        </div>
        {selectedVehicleId && (
          <div className="w-80 shrink-0 flex flex-col bg-gradient-to-b from-surface-1 to-surface border-l border-surface-border overflow-y-auto scrollbar-thin z-10">
            <VehiclePanel vehicleId={selectedVehicleId} />
          </div>
        )}
      </div>
      {timelineOpen && (
        <div className="h-56 shrink-0 bg-surface-1 border-t border-surface-border overflow-hidden z-10">
          <EventTimeline />
        </div>
      )}
    </div>
  )
}
