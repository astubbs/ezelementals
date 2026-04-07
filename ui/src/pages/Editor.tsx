import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { editor as editorApi } from '../lib/api'
import type { FxEntry } from '../lib/api'
import { EffectLanes } from '../components/EffectLanes'
import { Save, Undo2, Redo2, Trash2, Plus } from 'lucide-react'
import { CHANNEL_COLOR, CHANNEL_LABEL, CHANNELS } from '../lib/colors'

export default function Editor() {
  const [searchParams] = useSearchParams()
  const fxPath = searchParams.get('path') ?? ''

  const [entries, setEntries] = useState<FxEntry[]>([])
  const [selected, setSelected] = useState<FxEntry | null>(null)
  const [history, setHistory] = useState<FxEntry[][]>([])
  const [future, setFuture] = useState<FxEntry[][]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const durationS = entries.length > 0 ? entries[entries.length - 1].t + 30 : 0

  useEffect(() => {
    if (!fxPath) return
    editorApi.load(fxPath).then(t => { setEntries(t.entries); setLoading(false) })
  }, [fxPath])

  function pushHistory(current: FxEntry[]) {
    setHistory(h => [...h.slice(-50), current])
    setFuture([])
    setDirty(true)
  }

  function undo() {
    if (!history.length) return
    const prev = history[history.length - 1]
    setFuture(f => [entries, ...f])
    setHistory(h => h.slice(0, -1))
    setEntries(prev)
  }

  function redo() {
    if (!future.length) return
    const next = future[0]
    setHistory(h => [...h, entries])
    setFuture(f => f.slice(1))
    setEntries(next)
  }

  function updateSelected(field: keyof FxEntry, value: number) {
    if (!selected) return
    const updated = { ...selected, [field]: value }
    setSelected(updated)
    pushHistory(entries)
    setEntries(entries.map(e => Math.abs(e.t - selected.t) < 0.001 ? updated : e))
  }

  function deleteSelected() {
    if (!selected) return
    pushHistory(entries)
    setEntries(entries.filter(e => Math.abs(e.t - selected.t) >= 0.001))
    setSelected(null)
  }

  function addEntry() {
    const newT = selected ? selected.t + 5 : (entries[entries.length - 1]?.t ?? 0) + 5
    const entry: FxEntry = { t: newT, wind: 0, water: 0, heat_ambient: 0, heat_radiant: 0 }
    pushHistory(entries)
    setEntries([...entries, entry].sort((a, b) => a.t - b.t))
    setSelected(entry)
  }

  async function save() {
    setSaving(true)
    await editorApi.save(fxPath, entries)
    setSaving(false)
    setDirty(false)
  }

  if (!fxPath) return <div className="p-6 text-slate-400">No file selected.</div>
  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-slate-100 flex-1 truncate">{fxPath.split('/').pop()}</h1>
        <button onClick={undo} disabled={!history.length}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30" title="Undo">
          <Undo2 size={15} />
        </button>
        <button onClick={redo} disabled={!future.length}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30" title="Redo">
          <Redo2 size={15} />
        </button>
        <button onClick={addEntry}
          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800">
          <Plus size={14} /> Add
        </button>
        <button onClick={save} disabled={!dirty || saving}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg font-medium">
          <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          {dirty && !saving && <span className="w-1.5 h-1.5 rounded-full bg-blue-300 ml-0.5" />}
        </button>
      </div>

      {/* Timeline */}
      <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
        <EffectLanes
          entries={entries}
          durationS={durationS}
          selectedT={selected?.t}
          onSelect={setSelected}
        />
      </div>

      {/* Two-column: entry editor + entry list */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Selected entry editor */}
        <div className="w-72 bg-slate-900 rounded-lg p-4 border border-slate-800 shrink-0">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-slate-200 text-sm">t = {selected.t.toFixed(2)}s</div>
                <button onClick={deleteSelected}
                  className="p-1 hover:bg-red-900 rounded text-red-400" title="Delete entry">
                  <Trash2 size={14} />
                </button>
              </div>
              {CHANNELS.map(ch => {
                const val = (selected as unknown as Record<string, number>)[ch] ?? 0
                return (
                  <div key={ch} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: CHANNEL_COLOR[ch] }}>{CHANNEL_LABEL[ch]}</span>
                      <span className="text-slate-300 font-mono">{val}</span>
                    </div>
                    <input type="range" min={0} max={3} step={1} value={val}
                      onChange={e => updateSelected(ch as keyof FxEntry, Number(e.target.value))}
                      className="w-full h-1.5 rounded appearance-none cursor-pointer"
                      style={{ accentColor: CHANNEL_COLOR[ch] }} />
                    <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                      <span>off</span><span>subtle</span><span>mod</span><span>intense</span>
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <div className="text-slate-500 text-sm text-center mt-8">
              Click a block in the timeline to edit it
            </div>
          )}
        </div>

        {/* Entry list */}
        <div className="flex-1 bg-slate-900 rounded-lg border border-slate-800 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2 text-left text-slate-500 font-medium">t</th>
                <th className="px-2 py-2 text-slate-400">💨</th>
                <th className="px-2 py-2 text-slate-400">💧</th>
                <th className="px-2 py-2 text-slate-400">🔥</th>
                <th className="px-2 py-2 text-slate-400">🌡️</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const isSel = selected && Math.abs(entry.t - selected.t) < 0.001
                return (
                  <tr key={entry.t}
                    className={`cursor-pointer border-b border-slate-800/50 ${isSel ? 'bg-blue-900/30' : 'hover:bg-slate-800'}`}
                    onClick={() => setSelected(entry)}>
                    <td className="px-3 py-1.5 font-mono text-slate-300">{fmtTime(entry.t)}</td>
                    <td className="px-2 py-1.5 text-center"><IntBadge v={entry.wind} color="#3B82F6" /></td>
                    <td className="px-2 py-1.5 text-center"><IntBadge v={entry.water} color="#06B6D4" /></td>
                    <td className="px-2 py-1.5 text-center"><IntBadge v={entry.heat_radiant} color="#EF4444" /></td>
                    <td className="px-2 py-1.5 text-center"><IntBadge v={entry.heat_ambient} color="#F59E0B" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function IntBadge({ v, color }: { v: number; color: string }) {
  if (v === 0) return <span className="text-slate-700">0</span>
  return <span style={{ color }} className="font-mono font-bold">{v}</span>
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}
