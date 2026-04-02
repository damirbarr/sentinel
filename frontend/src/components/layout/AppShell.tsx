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
        <div className="w-72 shrink-0 flex flex-col bg-surface-1 border-r border-surface-border overflow-y-auto scrollbar-thin z-10">
          <ControlPanel />
        </div>
        <div className="flex-1 relative overflow-hidden">
          <MapCanvas />
          <button
            onClick={() => setTimelineOpen(!timelineOpen)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-surface-2 border border-surface-border text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-3 transition-all shadow-panel"
          >
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
            {timelineOpen ? 'Hide' : 'Show'} Event Timeline
          </button>
        </div>
        {selectedVehicleId && (
          <div className="w-80 shrink-0 flex flex-col bg-surface-1 border-l border-surface-border overflow-y-auto scrollbar-thin z-10">
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
