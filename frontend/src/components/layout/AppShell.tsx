import { useState, useCallback, useRef } from 'react'
import Header from './Header'
import MapCanvas from '../map/MapCanvas'
import ControlPanel from '../control/ControlPanel'
import VehiclePanel from '../vehicle/VehiclePanel'
import EventTimeline from '../timeline/EventTimeline'
import SettingsModal from '../settings/SettingsModal'
import { useUIStore } from '../../store/ui.store'

const LEFT_MIN = 200
const LEFT_MAX = 480
const RIGHT_MIN = 200
const RIGHT_MAX = 560

export default function AppShell() {
  const { selectedVehicleId, timelineOpen, setTimelineOpen } = useUIStore()
  const [leftWidth, setLeftWidth] = useState(288)
  const [rightWidth, setRightWidth] = useState(320)
  const draggingRef = useRef<null | 'left' | 'right'>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const startDrag = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = side
    startXRef.current = e.clientX
    startWidthRef.current = side === 'left' ? leftWidth : rightWidth

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startXRef.current
      if (draggingRef.current === 'left') {
        setLeftWidth(Math.min(LEFT_MAX, Math.max(LEFT_MIN, startWidthRef.current + delta)))
      } else {
        // Right pane grows leftward so delta is inverted
        setRightWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, startWidthRef.current - delta)))
      }
    }

    const onUp = () => {
      draggingRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [leftWidth, rightWidth])

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden select-none">
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left panel */}
        <div
          className="shrink-0 flex flex-col bg-surface-1/95 backdrop-blur-sm border-r border-surface-border overflow-y-auto scrollbar-thin z-10 shadow-[2px_0_24px_rgba(192,132,252,0.08)]"
          style={{ width: leftWidth, userSelect: 'none' }}
        >
          <ControlPanel />
        </div>

        {/* Left drag handle */}
        <div
          className="w-1 shrink-0 h-full bg-surface-border hover:bg-accent-violet/40 transition-colors cursor-col-resize z-20"
          onMouseDown={(e) => startDrag('left', e)}
        />

        <div className="flex-1 relative overflow-hidden">
          <MapCanvas />
          {/* Timeline toggle — pill with glowing border + gradient text */}
          <button
            onClick={() => setTimelineOpen(!timelineOpen)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1500] flex items-center gap-2 px-5 py-2 rounded-full bg-surface-2/90 backdrop-blur-sm border border-surface-border-bright border-glow-cyan text-xs font-semibold hover:border-accent-cyan/50 transition-all shadow-panel"
          >
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-ping-subtle" />
            <span className="gradient-text">{timelineOpen ? 'Hide' : 'Show'} Event Timeline</span>
          </button>
        </div>

        {selectedVehicleId && (
          <>
            {/* Right drag handle */}
            <div
              className="w-1 shrink-0 h-full bg-surface-border hover:bg-accent-violet/40 transition-colors cursor-col-resize z-20"
              onMouseDown={(e) => startDrag('right', e)}
            />
            {/* Right panel */}
            <div
              className="shrink-0 flex flex-col bg-surface-1/95 backdrop-blur-sm border-l border-surface-border overflow-y-auto scrollbar-thin z-10 shadow-[-2px_0_24px_rgba(192,132,252,0.08)]"
              style={{ width: rightWidth, userSelect: 'none' }}
            >
              <VehiclePanel vehicleId={selectedVehicleId} />
            </div>
          </>
        )}
      </div>
      {timelineOpen && (
        <div className="h-56 shrink-0 bg-surface-1 border-t border-surface-border overflow-hidden z-10">
          <EventTimeline />
        </div>
      )}
      <SettingsModal />
    </div>
  )
}
