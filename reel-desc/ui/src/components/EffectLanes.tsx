/**
 * Static multi-lane timeline — used in the Editor and Player pages.
 * Renders the full .3fx track as coloured blocks per channel.
 * Clicking a block calls onSelect(entry).
 */
import { useRef } from 'react'
import { CHANNEL_COLOR, CHANNELS } from '../lib/colors'
import type { FxEntry } from '../lib/api'

interface Props {
  entries: FxEntry[]
  durationS: number          // total movie duration (for scale)
  currentT?: number          // playback cursor position
  selectedT?: number | null
  onSelect?: (entry: FxEntry) => void
}

const LANE_HEIGHT = 24
const LABEL_WIDTH = 80
const LANE_LABELS: Record<string, string> = {
  wind: 'Wind',
  water: 'Water',
  heat_radiant: 'Radiant',
  heat_ambient: 'Ambient',
}

export function EffectLanes({ entries, durationS, currentT, selectedT, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const totalH = CHANNELS.length * LANE_HEIGHT

  function xPct(t: number) {
    return durationS > 0 ? (t / durationS) * 100 : 0
  }

  return (
    <div className="relative overflow-x-auto rounded-lg border border-slate-800 bg-[#0f0f17]"
      ref={containerRef} style={{ minHeight: totalH + 24 }}>
      {/* Lane rows */}
      {CHANNELS.map((ch, rowIdx) => {
        const hex = CHANNEL_COLOR[ch]
        const y = rowIdx * LANE_HEIGHT
        return (
          <div key={ch} className="absolute" style={{ top: y, left: 0, right: 0, height: LANE_HEIGHT }}>
            {/* Label */}
            <div className="absolute left-0 top-0 h-full flex items-center px-2 text-xs z-10"
              style={{ width: LABEL_WIDTH, color: hex + 'cc', background: '#0f0f17' }}>
              {LANE_LABELS[ch]}
            </div>
            {/* Blocks */}
            <div className="absolute" style={{ left: LABEL_WIDTH, right: 0, top: 0, bottom: 0 }}>
              {entries.map((entry, i) => {
                const intensity = (entry as unknown as Record<string, number>)[ch] ?? 0
                if (intensity === 0) return null
                const nextT = entries[i + 1]?.t ?? durationS
                const left = `${xPct(entry.t)}%`
                const width = `${xPct(nextT - entry.t)}%`
                const alpha = 0.15 + (intensity / 3) * 0.85
                const isSelected = selectedT !== null && selectedT !== undefined && Math.abs(entry.t - selectedT) < 0.001
                return (
                  <div key={entry.t}
                    className="absolute top-0.5 bottom-0.5 rounded cursor-pointer"
                    style={{
                      left, width,
                      background: hex,
                      opacity: alpha,
                      outline: isSelected ? `2px solid ${hex}` : undefined,
                    }}
                    onClick={() => onSelect?.(entry)}
                    title={`t=${entry.t}s  ${ch}=${intensity}`}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Playback cursor */}
      {currentT !== undefined && durationS > 0 && (
        <div className="absolute top-0 bottom-0 w-0.5 bg-white opacity-70 pointer-events-none z-20"
          style={{ left: `calc(${LABEL_WIDTH}px + ${xPct(currentT)}%)` }} />
      )}

      {/* Time axis */}
      <div className="absolute bottom-0 left-0 right-0 h-5 flex items-center"
        style={{ paddingLeft: LABEL_WIDTH }}>
        {Array.from({ length: 11 }).map((_, i) => {
          const t = (i / 10) * durationS
          return (
            <div key={i} className="absolute text-xs text-slate-600 font-mono"
              style={{ left: `${i * 10}%` }}>
              {fmtTime(t)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
