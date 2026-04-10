import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { editor as editorApi } from '../lib/api'
import type { FxEntry, TimelineFrameRecord } from '../lib/api'
import { CHANNEL_COLOR, CHANNEL_LABEL, CHANNELS } from '../lib/colors'
import { CheckCircle, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react'

type ReviewEntry = (FxEntry | TimelineFrameRecord) & { flagged?: boolean; flagged_for_review?: boolean; confidence?: number }

export default function ReviewQueue() {
  const [searchParams] = useSearchParams()
  const pathParam = searchParams.get('path') ?? ''
  const isBundlePath = pathParam.endsWith('.bundle') || (!pathParam.endsWith('.3fx') && pathParam !== '')

  const [entries, setEntries] = useState<ReviewEntry[]>([])
  const [flagged, setFlagged] = useState<ReviewEntry[]>([])
  const [idx, setIdx] = useState(0)
  const [edits, setEdits] = useState<Partial<FxEntry>>({})
  const [accepted, setAccepted] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!pathParam) return
    if (isBundlePath) {
      editorApi.loadTimeline(pathParam).then(r => {
        setEntries(r.frames)
        setFlagged(r.frames.filter(f => f.flagged_for_review))
        setLoading(false)
      })
    } else {
      editorApi.load(pathParam).then(t => {
        setEntries(t.entries)
        setFlagged(t.entries.filter(e => e.flagged))
        setLoading(false)
      })
    }
  }, [pathParam, isBundlePath])

  const current = flagged[idx]
  const isLast = idx >= flagged.length - 1

  function updateEdit(ch: string, val: number) {
    setEdits(e => ({ ...e, [ch]: val }))
  }

  async function accept() {
    if (!current) return
    const updated = { ...current, ...edits, flagged: false, flagged_for_review: false }
    if (isBundlePath) {
      await editorApi.patchFrame(pathParam, current.t, { ...edits, confidence: 1.0 })
    } else {
      await editorApi.save(pathParam, entries.map(e => Math.abs(e.t - current.t) < 0.001 ? updated : e) as FxEntry[])
    }
    setEntries(prev => prev.map(e => Math.abs(e.t - current.t) < 0.001 ? updated : e))
    setAccepted(a => a + 1)
    nextEntry()
  }

  function skip() { nextEntry() }

  function nextEntry() {
    setEdits({})
    setIdx(i => Math.min(i + 1, flagged.length - 1))
  }

  if (!pathParam) return <div className="p-6 text-slate-400">No file selected.</div>
  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!flagged.length) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <CheckCircle size={40} className="text-green-400" />
      <p className="text-slate-300 text-lg">No flagged frames</p>
      <p className="text-slate-500 text-sm">This track has no low-confidence entries to review.</p>
    </div>
  )

  if (idx >= flagged.length) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <CheckCircle size={40} className="text-green-400" />
      <p className="text-slate-300 text-lg">Review complete</p>
      <p className="text-slate-500 text-sm">Accepted {accepted} of {flagged.length} flagged frames.</p>
    </div>
  )

  const values = { ...current, ...edits }

  return (
    <div className="p-4 flex flex-col gap-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-100 flex-1">Review Queue</h1>
        <span className="text-sm text-slate-500">{idx + 1} / {flagged.length}</span>
        <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded">
          {flagged.length - accepted} remaining
        </span>
      </div>

      {/* Frame info */}
      <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono text-slate-300">t = {current.t.toFixed(2)}s</span>
          <span className="text-yellow-400 text-xs">⚠ low confidence</span>
          {current.confidence !== undefined && (
            <span className="text-xs text-slate-500">{Math.round(current.confidence * 100)}% confidence</span>
          )}
        </div>
        {/* VLM description — helps judge if the flag is reasonable */}
        {'description' in current && current.description && (
          <div className="mt-2 text-sm text-slate-300 italic">"{current.description}"</div>
        )}
        {'audio' in current && current.audio && (
          <div className="mt-1 text-xs text-slate-500">Audio: {current.audio}</div>
        )}
        {'scene_type' in current && current.scene_type && (
          <div className="mt-1 text-xs text-slate-600">Scene: {current.scene_type}
            {'motion' in current && current.motion ? ` · motion: ${current.motion}` : ''}
          </div>
        )}
      </div>

      {/* Frame images placeholder — in a real impl, stored alongside .3fx */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 rounded-lg border border-slate-800 aspect-video flex items-center justify-center text-slate-600 text-sm">
          Frame image unavailable<br /><span className="text-xs">(stored during encode)</span>
        </div>
        <div className="bg-slate-900 rounded-lg border border-slate-800 aspect-video flex items-center justify-center text-slate-600 text-sm">
          Spectrogram unavailable
        </div>
      </div>

      {/* Sliders */}
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Correct values</div>
        {CHANNELS.map(ch => {
          const val = (values as unknown as Record<string, number>)[ch] ?? 0
          return (
            <div key={ch} className="mb-4">
              <div className="flex justify-between text-sm mb-1.5">
                <span style={{ color: CHANNEL_COLOR[ch] }}>{CHANNEL_LABEL[ch]}</span>
                <span className="font-mono text-slate-200">{val}</span>
              </div>
              <input type="range" min={0} max={3} step={1} value={val}
                onChange={e => updateEdit(ch, Number(e.target.value))}
                className="w-full h-2 rounded cursor-pointer"
                style={{ accentColor: CHANNEL_COLOR[ch] }} />
              <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                <span>0 — none</span><span>1</span><span>2</span><span>3 — intense</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={() => { setEdits({}); setIdx(i => Math.max(0, i - 1)) }}
          disabled={idx === 0}
          className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 disabled:opacity-30">
          <ChevronLeft size={16} />
        </button>
        <button onClick={skip}
          className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-800 text-sm">
          <SkipForward size={14} /> Skip
        </button>
        <button onClick={accept}
          className="flex items-center gap-2 px-5 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium flex-1 justify-center">
          <CheckCircle size={14} /> Accept &amp; save
        </button>
        <button onClick={() => { setEdits({}); setIdx(i => Math.min(flagged.length - 1, i + 1)) }}
          disabled={isLast}
          className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
