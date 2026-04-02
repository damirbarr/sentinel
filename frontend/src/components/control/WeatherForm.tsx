import { useState } from 'react'
import { api } from '../../api/http'
import { useUIStore } from '../../store/ui.store'

const CONDITIONS = ['HEAVY_RAIN', 'FOG', 'STRONG_WIND', 'LOW_VISIBILITY', 'SNOW', 'ICE'] as const
const SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'EXTREME'] as const
const SEV_LABEL: Record<string, string> = { LOW: 'LOW', MODERATE: 'MOD', HIGH: 'HIGH', EXTREME: 'XTRM' }
const inp = "w-full px-3 py-2 rounded-lg bg-surface text-sm text-white border border-surface-border focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/30 transition-colors"
const lbl = "block text-xs font-medium text-slate-400 mb-1"

export default function WeatherForm() {
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>('HEAVY_RAIN')
  const [severity, setSeverity] = useState<typeof SEVERITIES[number]>('MODERATE')
  const [duration, setDuration] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isPlacingWeather, pendingWeatherCenter, pendingWeatherRadius, setPlacingWeather, setPendingWeatherCenter, setPendingWeatherRadius } = useUIStore()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      await api.publishEvent({
        type: 'WEATHER',
        payload: {
          condition, severity,
          ...(duration ? { durationMinutes: parseInt(duration, 10) } : {}),
          ...(pendingWeatherCenter ? { center: pendingWeatherCenter, radiusMeters: pendingWeatherRadius } : {}),
        }
      })
      setPlacingWeather(false)
      setPendingWeatherCenter(null)
    } catch (err) { setError((err as Error).message) }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={lbl}>Condition</label>
        <select value={condition} onChange={(e) => setCondition(e.target.value as typeof CONDITIONS[number])} className={`${inp} appearance-none`}>
          {CONDITIONS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Severity</label>
        <div className="grid grid-cols-4 gap-1">
          {SEVERITIES.map((s) => (
            <button key={s} type="button" onClick={() => setSeverity(s)}
              className={`py-1 rounded-lg text-xs font-medium border transition-colors ${severity === s ? 'bg-accent-blue/20 border-accent-blue text-accent-blue' : 'bg-surface border-surface-border text-slate-500 hover:text-white'}`}>
              {SEV_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={lbl}>Duration (minutes, optional)</label>
        <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 30" min={1} className={inp} />
      </div>
      <div>
        <label className={lbl}>
          Radius: <span className="text-white font-mono">{(pendingWeatherRadius / 1000).toFixed(1)} km</span>
        </label>
        <input type="range" min={1000} max={20000} step={500}
          value={pendingWeatherRadius}
          onChange={(e) => setPendingWeatherRadius(Number(e.target.value))}
          className="w-full accent-accent-blue" />
      </div>
      <button type="button"
        onClick={() => { setPlacingWeather(!isPlacingWeather); if (isPlacingWeather) setPendingWeatherCenter(null) }}
        className={`w-full py-2 rounded-lg text-xs font-semibold border transition-colors ${
          isPlacingWeather
            ? 'bg-amber-400/20 border-amber-400 text-amber-400'
            : pendingWeatherCenter
              ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
              : 'bg-surface border-surface-border text-slate-400 hover:text-white'
        }`}>
        {isPlacingWeather
          ? '⊕ Click map to place center…'
          : pendingWeatherCenter
            ? `✓ Center placed (${pendingWeatherCenter.lat.toFixed(4)}, ${pendingWeatherCenter.lng.toFixed(4)})`
            : '⊕ Place on Map'}
      </button>
      {error && <p className="text-xs text-accent-red">{error}</p>}
      <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-lg bg-accent-blue hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
        {submitting ? 'Publishing…' : 'Publish Weather Event'}
      </button>
      <p className="text-xs text-slate-500">
        {pendingWeatherCenter ? 'Zone placed on map.' : 'Publish globally or place a zone on the map first.'}
      </p>
    </form>
  )
}
