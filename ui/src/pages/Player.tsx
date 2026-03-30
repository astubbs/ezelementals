import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { player as playerApi, devices as devicesApi } from '../lib/api'
import type { FxEntry, DeviceConfig } from '../lib/api'
import { DeviceRack } from '../components/devices/DeviceRack'
import { EffectLanes } from '../components/EffectLanes'
import { editor as editorApi } from '../lib/api'
import { Wifi, WifiOff } from 'lucide-react'

const POLL_INTERVAL_MS = 500

export default function Player() {
  const [searchParams] = useSearchParams()
  const fxPath = searchParams.get('fx') ?? ''

  const [entries, setEntries] = useState<FxEntry[]>([])
  const [deviceList, setDeviceList] = useState<DeviceConfig[]>([])
  const [positionS, setPositionS] = useState<number | null>(null)
  const [currentFx, setCurrentFx] = useState<(FxEntry & { next_change_t: number | null }) | null>(null)
  const [haAvailable, setHaAvailable] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Duration from last entry timestamp
  const durationS = entries.length > 0 ? (entries[entries.length - 1].t + 30) : 0

  useEffect(() => {
    if (!fxPath) return
    Promise.all([editorApi.load(fxPath), devicesApi.list()]).then(([track, d]) => {
      setEntries(track.entries)
      setDeviceList(d.devices)
    })
  }, [fxPath])

  useEffect(() => {
    if (!fxPath) return
    pollRef.current = setInterval(async () => {
      try {
        const state = await playerApi.state(fxPath)
        setPositionS(state.position_s)
        setCurrentFx(state.current_fx)
        setHaAvailable(state.ha_available)
      } catch { /* ignore */ }
    }, POLL_INTERVAL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fxPath])

  if (!fxPath) return <div className="p-6 text-slate-400">No track selected.</div>

  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-100 flex-1 truncate">
          {fxPath.split('/').pop()}
        </h1>
        <div className={`flex items-center gap-1.5 text-xs ${haAvailable ? 'text-green-400' : 'text-slate-500'}`}>
          {haAvailable ? <Wifi size={13} /> : <WifiOff size={13} />}
          {haAvailable ? 'HA connected' : 'HA offline'}
        </div>
      </div>

      {/* Transport */}
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-slate-200 text-lg tabular-nums w-24">
            {positionS !== null ? fmtTime(positionS) : '--:--:--'}
          </span>
          <div className="flex-1 relative h-2 bg-slate-800 rounded-full cursor-pointer">
            <div className="h-full bg-blue-500 rounded-full"
              style={{ width: durationS > 0 && positionS !== null ? `${(positionS / durationS) * 100}%` : '0%' }} />
          </div>
          <span className="font-mono text-slate-500 text-sm tabular-nums w-16 text-right">
            {durationS > 0 ? fmtTime(durationS) : '--:--'}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          Playback controlled by Home Assistant media player. Transport controls reflect HA state.
        </div>
      </div>

      {/* Current effect readout */}
      {currentFx && (
        <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Current Effect</div>
          <div className="flex gap-6">
            {(['wind', 'water', 'heat_radiant', 'heat_ambient'] as const).map(ch => (
              <div key={ch} className="flex flex-col items-center gap-1">
                <span className="text-lg font-mono text-slate-200">{(currentFx as any)[ch]}</span>
                <span className="text-xs text-slate-500">{ch.replace('_', ' ')}</span>
              </div>
            ))}
            {currentFx.next_change_t !== null && (
              <div className="ml-auto text-xs text-slate-500 self-center">
                Next change in {(currentFx.next_change_t - (positionS ?? 0)).toFixed(1)}s
              </div>
            )}
          </div>
        </div>
      )}

      {/* Device rack */}
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Devices</div>
        <DeviceRack devices={deviceList} fx={currentFx} />
      </div>

      {/* Timeline */}
      {entries.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Track Overview</div>
          <EffectLanes entries={entries} durationS={durationS} currentT={positionS ?? undefined} />
        </div>
      )}
    </div>
  )
}

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
