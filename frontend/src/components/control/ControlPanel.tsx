import { useState } from 'react'
import WeatherForm from './WeatherForm'
import GeofenceForm from './GeofenceForm'
import NetworkForm from './NetworkForm'
import ActiveConstraints from './ActiveConstraints'

type Tab = 'constraints' | 'weather' | 'geofence' | 'network'
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'constraints', label: 'Active', icon: '◈' },
  { id: 'weather',     label: 'Weather', icon: '⛈' },
  { id: 'geofence',    label: 'Geofence', icon: '⬡' },
  { id: 'network',     label: 'Network', icon: '⊟' },
]

export default function ControlPanel() {
  const [tab, setTab] = useState<Tab>('constraints')
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-surface-border">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Operator Console</h2>
      </div>
      <div className="flex border-b border-surface-border px-2 pt-2 gap-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-t-lg text-xs transition-colors ${tab === t.id ? 'bg-surface-2 text-white border border-b-0 border-surface-border' : 'text-slate-500 hover:text-slate-300'}`}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {tab === 'constraints' && <ActiveConstraints />}
        {tab === 'weather'     && <WeatherForm />}
        {tab === 'geofence'    && <GeofenceForm />}
        {tab === 'network'     && <NetworkForm />}
      </div>
    </div>
  )
}
