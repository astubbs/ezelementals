/** Status card for one Ollama worker instance during encoding. */
import type { WsEvent } from '../lib/websocket'

interface WorkerState {
  frameIndex: number
  timestampS: number
  lastResult?: WsEvent
}

interface Props {
  workerId: number
  url: string
  model: string
  state: WorkerState | undefined
}

export function WorkerCard({ workerId, url, model, state }: Props) {
  const result = state?.lastResult
  const flagged = result?.flagged as boolean | undefined
  const confidence = result?.confidence as number | undefined

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-mono text-slate-300">Worker {workerId + 1}</span>
      </div>
      <div className="text-xs text-slate-500 truncate">{url}</div>
      <div className="text-xs text-slate-500 truncate mb-2">{model}</div>

      {state ? (
        <>
          <div className="text-xs text-slate-300 mb-1">
            frame {state.frameIndex} · t={state.timestampS.toFixed(1)}s
          </div>
          {result && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
              <ChannelBit label="W" value={result.wind as number} color="#3B82F6" />
              <ChannelBit label="💧" value={result.water as number} color="#06B6D4" />
              <ChannelBit label="🔥" value={result.heat_radiant as number} color="#EF4444" />
              <ChannelBit label="🌡" value={result.heat_ambient as number} color="#F59E0B" />
            </div>
          )}
          {confidence !== undefined && (
            <div className={`text-xs mt-1.5 ${flagged ? 'text-yellow-400' : 'text-slate-500'}`}>
              {flagged ? '⚠ ' : '✓ '}conf {(confidence * 100).toFixed(0)}%
            </div>
          )}
        </>
      ) : (
        <div className="text-xs text-slate-600">Idle</div>
      )}
    </div>
  )
}

function ChannelBit({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-slate-500">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-sm"
            style={{ background: i <= value ? color : '#374151' }} />
        ))}
      </div>
    </div>
  )
}
