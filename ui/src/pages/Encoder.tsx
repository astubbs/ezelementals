import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { encoder, devices as devicesApi, settings as settingsApi } from '../lib/api'
import type { DeviceConfig, Settings } from '../lib/api'
import { useEncoderWs } from '../lib/websocket'
import { FrameViewer } from '../components/FrameViewer'
import { WorkerCard } from '../components/WorkerCard'
import { EffectTrail } from '../components/EffectTrail'
import { DeviceRack } from '../components/devices/DeviceRack'
import { XCircle, Play } from 'lucide-react'

export default function Encoder() {
  const [searchParams] = useSearchParams()
  const videoPath = searchParams.get('video') ?? ''
  const navigate = useNavigate()

  const [jobId, setJobId] = useState<string | null>(null)
  const [deviceList, setDeviceList] = useState<DeviceConfig[]>([])
  const [appSettings, setAppSettings] = useState<Settings | null>(null)
  const [started, setStarted] = useState(false)

  const { state, cancel } = useEncoderWs(jobId)

  useEffect(() => {
    Promise.all([devicesApi.list(), settingsApi.load()]).then(([d, s]) => {
      setDeviceList(d.devices)
      setAppSettings(s)
    })
  }, [])

  async function startEncode() {
    const workers = appSettings?.ollama_instances?.map(i => ({ url: i.url, model: i.model }))
    const defaults = appSettings?.encoding_defaults
    const result = await encoder.start({
      video_path: videoPath,
      fps: defaults?.fps ?? 0.5,
      confidence_threshold: defaults?.confidence_threshold ?? 0.7,
      stub_llm: defaults?.stub_llm ?? false,
      workers: workers?.length ? workers : undefined,
    })
    setJobId(result.job_id)
    setStarted(true)
  }

  // Latest FxEntry from the most recent result event
  const latestResult = [...state.events].reverse().find(e => e.type === 'result')
  const currentFx = latestResult ? {
    wind: latestResult.wind as number,
    water: latestResult.water as number,
    heat_ambient: latestResult.heat_ambient as number,
    heat_radiant: latestResult.heat_radiant as number,
  } : null

  const workerDefs = appSettings?.ollama_instances ?? [{ url: 'http://localhost:11434', model: 'qwen2.5-vl:7b' }]
  const progress = state.progress
  const pct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  if (!videoPath) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">No video selected. <a href="/" className="text-blue-400 hover:underline">Go to Library</a></div>
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-100 flex-1 truncate">{videoPath.split('/').pop()}</h1>
        {!started ? (
          <button onClick={startEncode}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium">
            <Play size={14} /> Start Encode
          </button>
        ) : !state.done ? (
          <button onClick={cancel}
            className="flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-lg text-sm font-medium text-red-200">
            <XCircle size={14} /> Cancel
          </button>
        ) : (
          <button onClick={() => navigate(`/editor?path=${encodeURIComponent((state.events.find(e => e.type === 'done') as any)?.output_path ?? '')}`)}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium">
            Open in Editor
          </button>
        )}
      </div>

      {/* Main two-column layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Frame + spectrogram */}
          <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
            <FrameViewer
              frame={state.latestFrame?.frame ?? null}
              spectrogram={state.latestFrame?.spectrogram ?? null}
              frameIndex={state.latestFrame?.frameIndex ?? 0}
              timestampS={state.latestFrame ? (Object.values(state.workers)[0]?.timestampS ?? 0) : 0}
              total={progress?.total ?? 0}
            />
          </div>

          {/* Worker cards */}
          {started && (
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Workers</div>
              <div className="flex flex-wrap gap-3">
                {workerDefs.map((w, i) => (
                  <WorkerCard
                    key={i}
                    workerId={i}
                    url={w.url}
                    model={w.model}
                    state={state.workers[i]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Device rack preview */}
          <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Live Device Preview</div>
            <DeviceRack devices={deviceList} fx={currentFx} />
          </div>

          {/* Progress bar */}
          {started && (
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>{progress?.completed ?? 0} / {progress?.total ?? '…'} frames</span>
                <span>
                  {progress?.etaS ? `ETA ${fmtEta(progress.etaS)}` : state.done ? '✓ Complete' : 'Calculating…'}
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }} />
              </div>
              {state.done && (
                <div className="mt-2 text-xs text-green-400">
                  ✓ Done — {(state.events.find(e => e.type === 'done') as any)?.flagged_count ?? 0} flagged frames
                </div>
              )}
              {state.error && <div className="mt-2 text-xs text-red-400">⚠ {state.error}</div>}
            </div>
          )}
        </div>

        {/* Right column — effect trail */}
        <div className="w-72 flex flex-col gap-2 shrink-0">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Effect Trail</div>
          <EffectTrail events={state.events} maxEntries={100} />
          <div className="text-xs text-slate-600 mt-1">
            Color = channel · Brightness = intensity · White tick = low confidence
          </div>
        </div>
      </div>
    </div>
  )
}

function fmtEta(s: number): string {
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}
