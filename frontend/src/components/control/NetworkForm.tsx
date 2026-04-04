import { useState } from 'react'
import { api } from '../../api/http'
import { useVehiclesStore, shallow } from '../../store/vehicles.store'

const SEVERITIES = ['DEGRADED', 'UNSTABLE', 'LOST'] as const
const DESCS: Record<string, string> = { DEGRADED: 'Reduced bandwidth — degraded speed mode.', UNSTABLE: 'Intermittent connection — degraded speed.', LOST: 'No connection — safe stop recommended.' }
const inp = "w-full px-3 py-2 rounded-lg bg-surface text-sm text-white border border-surface-border focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/30 transition-colors"
const lbl = "block text-xs font-medium text-slate-400 mb-1"

export default function NetworkForm() {
  const vehicleIds = useVehiclesStore((s) => Object.keys(s.vehicles), shallow)
  const [severity, setSeverity] = useState<typeof SEVERITIES[number]>('DEGRADED')
  const [target, setTarget] = useState('all')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      await api.publishEvent({ type: 'NETWORK', payload: { severity, ...(target !== 'all' ? { vehicleId: target } : {}) } })
    } catch (err) { setError((err as Error).message) }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-slate-500">Simulate a network degradation event.</p>
      <div>
        <label className={lbl}>Severity</label>
        <div className="space-y-1.5">
          {SEVERITIES.map((s) => (
            <label key={s} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${severity === s ? 'border-accent-blue bg-accent-blue/5' : 'border-surface-border hover:border-slate-600'}`}>
              <input type="radio" name="severity" value={s} checked={severity === s} onChange={() => setSeverity(s)} className="mt-0.5 accent-accent-blue" />
              <div><div className="text-xs font-semibold text-white">{s}</div><div className="text-xs text-slate-500">{DESCS[s]}</div></div>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className={lbl}>Target</label>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className={`${inp} appearance-none`}>
          <option value="all">All Vehicles (global)</option>
          {vehicleIds.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </div>
      {error && <p className="text-xs text-accent-red">{error}</p>}
      <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-lg bg-accent-blue hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
        {submitting ? 'Publishing…' : 'Publish Network Event'}
      </button>
    </form>
  )
}
