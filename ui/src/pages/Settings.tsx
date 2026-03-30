import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { settings as settingsApi } from '../lib/api'
import type { Settings as SettingsType } from '../lib/api'
import { Plus, Trash2, Save, Zap } from 'lucide-react'

export default function Settings() {
  const [s, setS] = useState<SettingsType | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { settingsApi.load().then(setS) }, [])

  function update(path: string[], value: unknown) {
    setS(prev => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev))
      let cur: Record<string, unknown> = next
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] as Record<string, unknown>
      cur[path[path.length - 1]] = value
      return next
    })
  }

  async function save() {
    if (!s) return
    setSaving(true)
    await settingsApi.save(s)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!s) return <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 flex-1">Settings</h1>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-sm font-medium">
          <Save size={14} /> {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Media roots */}
      <Section title="Media Folders">
        <p className="text-slate-400 text-sm mb-3">Folders containing your movie files. Subfolders are scanned automatically.</p>
        {s.media_roots.map((root, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input value={root} onChange={e => update(['media_roots', String(i)], e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500" />
            <button onClick={() => update(['media_roots'], s.media_roots.filter((_, j) => j !== i))}
              className="p-2 hover:bg-red-900 rounded text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
          </div>
        ))}
        <button onClick={() => update(['media_roots'], [...s.media_roots, ''])}
          className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mt-1">
          <Plus size={14} /> Add folder
        </button>
      </Section>

      {/* Ollama instances */}
      <Section title="Ollama Instances">
        <p className="text-slate-400 text-sm mb-3">Add multiple instances for parallel encoding. Set role to control two-pass mode.</p>
        {s.ollama_instances.map((inst, i) => (
          <div key={i} className="bg-slate-900 rounded-lg p-3 border border-slate-800 mb-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 block mb-1">URL</label>
                <input value={inst.url} onChange={e => update(['ollama_instances', String(i), 'url'], e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Role</label>
                <select value={inst.role} onChange={e => update(['ollama_instances', String(i), 'role'], e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500">
                  <option value="any">any</option>
                  <option value="pass1">pass 1 (fast)</option>
                  <option value="pass2">pass 2 (accurate)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 block mb-1">Model</label>
                <input value={inst.model} onChange={e => update(['ollama_instances', String(i), 'model'], e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-end">
                <button onClick={() => update(['ollama_instances'], s.ollama_instances.filter((_, j) => j !== i))}
                  className="p-2 hover:bg-red-900 rounded text-slate-500 hover:text-red-400 w-full flex justify-center"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => update(['ollama_instances'], [...s.ollama_instances, { url: 'http://localhost:11434', model: 'qwen2.5-vl:7b', role: 'any' }])}
          className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mt-1">
          <Plus size={14} /> Add instance
        </button>
      </Section>

      {/* Home Assistant */}
      <Section title="Home Assistant">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 block mb-1">Base URL</label>
            <input value={s.ha.base_url} onChange={e => update(['ha', 'base_url'], e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 block mb-1">Long-lived access token</label>
            <input type="password" value={s.ha.token} onChange={e => update(['ha', 'token'], e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 block mb-1">Media player entity</label>
            <input value={s.ha.media_player_entity} onChange={e => update(['ha', 'media_player_entity'], e.target.value)}
              placeholder="media_player.living_room"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500" />
          </div>
        </div>
      </Section>

      {/* Encoding defaults */}
      <Section title="Encoding Defaults">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">FPS (extraction rate)</label>
            <input type="number" step="0.1" value={s.encoding_defaults.fps}
              onChange={e => update(['encoding_defaults', 'fps'], Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Confidence threshold</label>
            <input type="number" step="0.05" min="0" max="1" value={s.encoding_defaults.confidence_threshold}
              onChange={e => update(['encoding_defaults', 'confidence_threshold'], Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <Toggle checked={s.encoding_defaults.two_pass} onChange={v => update(['encoding_defaults', 'two_pass'], v)} />
            <span className="text-sm text-slate-300">Two-pass mode</span>
          </div>
          <div className="flex items-center gap-2">
            <Toggle checked={s.encoding_defaults.stub_llm} onChange={v => update(['encoding_defaults', 'stub_llm'], v)} />
            <span className="text-sm text-slate-300">Stub LLM (no GPU needed)</span>
          </div>
        </div>
      </Section>

      {/* Device Setup */}
      <Section title="Device Setup">
        <p className="text-slate-400 text-sm mb-3">Re-run the device setup wizard. Your existing answers will be pre-filled.</p>
        <button onClick={() => navigate('/devices')}
          className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800">
          <Zap size={14} /> Run Setup Wizard
        </button>
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300">Theme</span>
          <div className="flex gap-2">
            {['dark', 'light'].map(t => (
              <button key={t} onClick={() => update(['ui', 'theme'], t)}
                className={`px-3 py-1 rounded text-sm border ${s.ui.theme === t ? 'bg-slate-700 border-slate-500 text-slate-200' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">{title}</h2>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}
