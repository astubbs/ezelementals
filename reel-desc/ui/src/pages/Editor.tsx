import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { editor as editorApi } from '../lib/api'
import type { FxEntry, TimelineFrameRecord } from '../lib/api'
import { EffectLanes } from '../components/EffectLanes'
import { Save, Undo2, Redo2, Trash2, Plus } from 'lucide-react'
import { CHANNEL_COLOR, CHANNEL_LABEL, CHANNELS } from '../lib/colors'

// A unified entry used internally: either a TimelineFrameRecord (bundle) or FxEntry (legacy)
type EditorEntry = TimelineFrameRecord | FxEntry

function isTimeline(entries: EditorEntry[]): entries is TimelineFrameRecord[] {
  return entries.length === 0 || 'description' in entries[0]
}

function toFxEntry(e: EditorEntry): FxEntry {
  return { t: e.t, wind: e.wind, water: e.water, heat_ambient: e.heat_ambient, heat_radiant: e.heat_radiant }
}

export default function Editor() {
  const [searchParams] = useSearchParams()
  const pathParam = searchParams.get('path') ?? ''

  // Detect bundle vs legacy .3fx
  const isBundlePath = pathParam.endsWith('.bundle') || (!pathParam.endsWith('.3fx') && pathParam !== '')

  const [entries, setEntries] = useState<EditorEntry[]>([])
  const [selected, setSelected] = useState<EditorEntry | null>(null)
  const [history, setHistory] = useState<EditorEntry[][]>([])
  const [future, setFuture] = useState<EditorEntry[][]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fxEntries: FxEntry[] = entries.map(toFxEntry)
  const durationS = fxEntries.length > 0 ? fxEntries[fxEntries.length - 1].t + 30 : 0
  const selectedFx = selected ? toFxEntry(selected) : null

  useEffect(() => {
    if (!pathParam) return
    if (isBundlePath) {
      editorApi.loadTimeline(pathParam).then(r => {
        setEntries(r.frames)
        setLoading(false)
      })
    } else {
      editorApi.load(pathParam).then(r => {
        setEntries(r.entries)
        setLoading(false)
      })
    }
  }, [pathParam, isBundlePath])

  function pushHistory(current: EditorEntry[]) {
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

  function updateSelectedIntensity(field: keyof FxEntry, value: number) {
    if (!selected) return
    const updated = { ...selected, [field]: value }
    setSelected(updated)
    pushHistory(entries)
    setEntries(entries.map(e => Math.abs(e.t - selected.t) < 0.001 ? updated : e))
  }

  function updateSelectedText(field: keyof TimelineFrameRecord, value: string) {
    if (!selected || !('description' in selected)) return
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
    if (isBundlePath && isTimeline(entries)) {
      await editorApi.saveTimeline(pathParam, entries)
    } else {
      await editorApi.save(pathParam, entries.map(toFxEntry))
    }
    setSaving(false)
    setDirty(false)
  }

  if (!pathParam) return <div className="p-6 text-slate-400">No file selected.</div>
  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  const selectedTl = selected && 'description' in selected ? selected as TimelineFrameRecord : null

  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-slate-100 flex-1 truncate">{pathParam.split('/').pop()}</h1>
        {isBundlePath && <span className="text-xs text-blue-400 border border-blue-800 rounded px-1.5 py-0.5">timeline</span>}
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
          entries={fxEntries}
          durationS={durationS}
          selectedT={selectedFx?.t}
          onSelect={t => setSelected(entries.find(e => Math.abs(e.t - t.t) < 0.001) ?? null)}
        />
      </div>

      {/* Two-column: entry editor + entry list */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Selected entry editor */}
        <div className="w-80 bg-slate-900 rounded-lg p-4 border border-slate-800 shrink-0 overflow-y-auto">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-slate-200 text-sm">t = {selected.t.toFixed(2)}s</div>
                <div className="flex items-center gap-2">
                  {selectedTl && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${selectedTl.confidence < 0.7 ? 'bg-yellow-900/40 text-yellow-400' : 'bg-slate-800 text-slate-400'}`}>
                      {Math.round(selectedTl.confidence * 100)}% conf
                    </span>
                  )}
                  <button onClick={deleteSelected}
                    className="p-1 hover:bg-red-900 rounded text-red-400" title="Delete entry">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Elemental intensity sliders */}
              {CHANNELS.map(ch => {
                const val = (selected as unknown as Record<string, number>)[ch] ?? 0
                return (
                  <div key={ch} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: CHANNEL_COLOR[ch] }}>{CHANNEL_LABEL[ch]}</span>
                      <span className="text-slate-300 font-mono">{val}</span>
                    </div>
                    <input type="range" min={0} max={3} step={1} value={val}
                      onChange={e => updateSelectedIntensity(ch as keyof FxEntry, Number(e.target.value))}
                      className="w-full h-1.5 rounded appearance-none cursor-pointer"
                      style={{ accentColor: CHANNEL_COLOR[ch] }} />
                    <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                      <span>off</span><span>subtle</span><span>mod</span><span>intense</span>
                    </div>
                  </div>
                )
              })}

              {/* Timeline-only fields */}
              {selectedTl && (
                <div className="mt-4 border-t border-slate-800 pt-4 flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Scene type · motion</label>
                    <div className="flex gap-2">
                      <input value={selectedTl.scene_type} onChange={e => updateSelectedText('scene_type', e.target.value)}
                        placeholder="exterior_desert"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500" />
                      <select value={selectedTl.motion} onChange={e => updateSelectedText('motion', e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500">
                        {['none', 'low', 'medium', 'high'].map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Description</label>
                    <textarea value={selectedTl.description} onChange={e => updateSelectedText('description', e.target.value)}
                      rows={3}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 resize-none focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Audio</label>
                    <textarea value={selectedTl.audio} onChange={e => updateSelectedText('audio', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 resize-none focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              )}
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
                {isBundlePath && <th className="px-3 py-2 text-left text-slate-500 font-medium">Description</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const isSel = selected && Math.abs(entry.t - selected.t) < 0.001
                const tl = 'description' in entry ? entry as TimelineFrameRecord : null
                return (
                  <tr key={entry.t}
                    className={`cursor-pointer border-b border-slate-800/50 ${isSel ? 'bg-blue-900/30' : 'hover:bg-slate-800'}`}
                    onClick={() => setSelected(entry)}>
                    <td className="px-3 py-1.5 font-mono text-slate-300">
                      {fmtTime(entry.t)}
                      {tl && tl.confidence < 0.7 && <span className="ml-1 text-yellow-500">⚠</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center"><IntBadge v={entry.wind} color="#3B82F6" /></td>
                    <td className="px-2 py-1.5 text-center"><IntBadge v={entry.water} color="#06B6D4" /></td>
                    <td className="px-2 py-1.5 text-center"><IntBadge v={entry.heat_radiant} color="#EF4444" /></td>
                    <td className="px-2 py-1.5 text-center"><IntBadge v={entry.heat_ambient} color="#F59E0B" /></td>
                    {isBundlePath && (
                      <td className="px-3 py-1.5 text-slate-400 max-w-xs truncate italic">
                        {tl?.description ?? ''}
                      </td>
                    )}
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
