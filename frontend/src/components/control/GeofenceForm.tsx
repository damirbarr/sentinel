import { useState } from 'react'
import { api } from '../../api/http'
import { useUIStore } from '../../store/ui.store'

const TYPES = ['FORBIDDEN', 'CAUTION', 'SLOW'] as const
const DESCS: Record<string, string> = { FORBIDDEN: 'Vehicle must stop inside this zone.', CAUTION: 'Vehicle reduces speed and proceeds with caution.', SLOW: 'Vehicle reduces speed inside this zone.' }
const inp = "w-full px-3 py-2 rounded-lg bg-surface text-sm text-white border border-surface-border focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/30 transition-colors"
const lbl = "block text-xs font-medium text-slate-400 mb-1"

export default function GeofenceForm() {
  const [type, setType] = useState<typeof TYPES[number]>('CAUTION')
  const [label, setLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isDrawingGeofence, setDrawingGeofence, pendingPolygon, setPendingPolygon } = useUIStore()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pendingPolygon || pendingPolygon.length < 3) { setError('Draw a polygon on the map first.'); return }
    setSubmitting(true); setError(null)
    try {
      await api.publishEvent({ type: 'GEOFENCE', payload: { type, polygon: pendingPolygon, ...(label ? { label } : {}) } })
      setPendingPolygon(null); setLabel('')
    } catch (err) { setError((err as Error).message) }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-slate-500">Draw a polygon on the map, then publish a geofence zone.</p>
      <div>
        <label className={lbl}>Zone Type</label>
        <div className="space-y-1.5">
          {TYPES.map((t) => (
            <label key={t} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${type === t ? 'border-accent-blue bg-accent-blue/5' : 'border-surface-border hover:border-slate-600'}`}>
              <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="mt-0.5 accent-accent-blue" />
              <div><div className="text-xs font-semibold text-white">{t}</div><div className="text-xs text-slate-500">{DESCS[t]}</div></div>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className={lbl}>Label (optional)</label>
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Construction Zone A" className={inp} />
      </div>
      <button type="button" onClick={() => setDrawingGeofence(!isDrawingGeofence)}
        className={`w-full py-2.5 rounded-lg border text-sm font-semibold transition-colors ${isDrawingGeofence ? 'bg-accent-orange/10 border-accent-orange text-accent-orange' : 'bg-surface-2 border-surface-border text-slate-300 hover:text-white'}`}>
        {isDrawingGeofence ? '⬡ Drawing… click on map' : '⬡ Draw Polygon on Map'}
      </button>
      {pendingPolygon && pendingPolygon.length >= 3 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-green/10 border border-accent-green/20">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
          <span className="text-xs text-accent-green">{pendingPolygon.length} points captured</span>
          <button type="button" onClick={() => setPendingPolygon(null)} className="ml-auto text-xs text-slate-500 hover:text-slate-300">clear</button>
        </div>
      )}
      {error && <p className="text-xs text-accent-red">{error}</p>}
      <button type="submit" disabled={submitting || !pendingPolygon || pendingPolygon.length < 3}
        className="w-full py-2.5 rounded-lg bg-accent-blue hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
        {submitting ? 'Publishing…' : 'Publish Geofence'}
      </button>
    </form>
  )
}
