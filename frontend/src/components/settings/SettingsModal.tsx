import { useUIStore } from '../../store/ui.store'

export default function SettingsModal() {
  const {
    settingsOpen,
    toggleSettings,
    settingMaxConstraintDistance,
    settingSpeedDegradationPct,
    settingAutoRotateBrain,
    setSettingMaxConstraintDistance,
    setSettingSpeedDegradationPct,
    setSettingAutoRotateBrain,
  } = useUIStore()

  if (!settingsOpen) return null

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) toggleSettings() }}
    >
      <div className="w-full max-w-md mx-4 rounded-lg bg-surface-1 border border-surface-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-slate-400">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3zm0 2a3 3 0 100 6 3 3 0 000-6z" fill="currentColor" opacity="0.4"/>
              <circle cx="8" cy="8" r="2" fill="#c084fc"/>
            </svg>
            <span className="text-sm font-bold tracking-widest uppercase text-slate-200">Settings</span>
          </div>
          <button
            onClick={toggleSettings}
            className="text-slate-500 hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-2"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-6">
          {/* Max constraint distance */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-0.5">
              Max Constraint Distance (km)
            </label>
            <p className="text-[10px] text-slate-500 mb-2">Vehicles ignore constraints farther than this. Set 0 to disable.</p>
            <input
              type="number"
              min={0}
              step={1}
              value={settingMaxConstraintDistance}
              onChange={(e) => setSettingMaxConstraintDistance(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface text-sm text-white border border-surface-border focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/30 transition-colors"
            />
          </div>

          {/* Speed degradation */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-0.5">
              Speed Degradation per Constraint (%)
            </label>
            <p className="text-[10px] text-slate-500 mb-2">Speed reduction per active constraint (floor: 30%).</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={settingSpeedDegradationPct}
                onChange={(e) => setSettingSpeedDegradationPct(Number(e.target.value))}
                className="flex-1 accent-accent-blue"
              />
              <span className="text-sm font-mono font-bold text-accent-blue w-10 text-right">{settingSpeedDegradationPct}%</span>
            </div>
          </div>

          {/* Auto-rotate brain */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-300">Auto-Rotate Brain</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Animate brain canvas rotation automatically.</p>
            </div>
            <button
              type="button"
              onClick={() => setSettingAutoRotateBrain(!settingAutoRotateBrain)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                settingAutoRotateBrain ? 'bg-accent-blue/80 border-accent-blue' : 'bg-surface-2 border-surface-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  settingAutoRotateBrain ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border bg-surface/50 flex justify-end">
          <button
            onClick={toggleSettings}
            className="px-4 py-1.5 rounded-lg bg-accent-blue hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
