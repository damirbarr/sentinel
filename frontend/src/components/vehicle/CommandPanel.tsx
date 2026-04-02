import { useState } from 'react'
import { api } from '../../api/http'

const COMMANDS = [
  { id: 'SIMULATE_NETWORK_DEGRADED', label: 'Network Degraded', icon: '📶', color: 'text-orange-400 border-orange-400/30 hover:bg-orange-400/10', desc: 'Simulate poor connectivity' },
  { id: 'SIMULATE_NETWORK_LOST',     label: 'Network Lost',     icon: '📵', color: 'text-red-400 border-red-400/30 hover:bg-red-400/10',    desc: 'Simulate total signal loss → stop' },
  { id: 'SIMULATE_OBSTACLE_DETECTED', label: 'Obstacle Detected', icon: '🚧', color: 'text-red-400 border-red-400/30 hover:bg-red-400/10', desc: 'Emergency stop — obstacle in path' },
  { id: 'SIMULATE_SENSOR_FAULT',     label: 'Sensor Fault',     icon: '⚠️', color: 'text-amber-400 border-amber-400/30 hover:bg-amber-400/10', desc: 'Report sensor malfunction' },
  { id: 'CLEAR_SIMULATION',          label: 'Clear All',        icon: '✓',  color: 'text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10', desc: 'Remove all simulated conditions' },
]

export default function CommandPanel({ vehicleId }: { vehicleId: string }) {
  const [perceptionMsg, setPerceptionMsg] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function send(command: string, payload?: Record<string, unknown>) {
    setSending(command)
    setStatus(null)
    try {
      await api.sendCommand(vehicleId, command, payload)
      setStatus(`✓ ${command.replace('SIMULATE_', '').replace(/_/g, ' ')} sent`)
    } catch (e) {
      setStatus(`✗ ${(e as Error).message}`)
    } finally {
      setSending(null)
      setTimeout(() => setStatus(null), 3000)
    }
  }

  return (
    <div className="p-4 space-y-3 select-none">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Direct Commands</p>

      {/* Perception alarm - has text input */}
      <div className="rounded-lg border border-violet-400/20 bg-violet-400/5 p-2.5 space-y-2">
        <p className="text-[10px] font-semibold text-violet-400">Perception Alarm</p>
        <input
          type="text"
          value={perceptionMsg}
          onChange={(e) => setPerceptionMsg(e.target.value)}
          placeholder="e.g. Lane markings unclear"
          className="w-full px-2 py-1.5 rounded-md bg-surface text-xs text-white border border-surface-border focus:border-violet-400/50 focus:outline-none placeholder:text-slate-600"
        />
        <button
          onClick={() => send('SIMULATE_PERCEPTION_ALARM', { message: perceptionMsg || 'Perception fault detected' })}
          disabled={sending === 'SIMULATE_PERCEPTION_ALARM'}
          className="w-full py-1.5 rounded-md bg-violet-400/10 hover:bg-violet-400/20 border border-violet-400/30 text-violet-400 text-xs font-semibold transition-colors disabled:opacity-40">
          {sending === 'SIMULATE_PERCEPTION_ALARM' ? 'Sending…' : '👁 Send Perception Alarm'}
        </button>
      </div>

      {/* Other commands */}
      <div className="space-y-1.5">
        {COMMANDS.map((cmd) => (
          <button key={cmd.id}
            onClick={() => send(cmd.id)}
            disabled={!!sending}
            title={cmd.desc}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-40 ${cmd.color}`}>
            <span>{cmd.icon}</span>
            <span className="flex-1 text-left">{cmd.label}</span>
            {sending === cmd.id && <span className="text-[10px] opacity-60">…</span>}
          </button>
        ))}
      </div>

      {status && (
        <p className={`text-[10px] text-center font-mono ${status.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
          {status}
        </p>
      )}
    </div>
  )
}
