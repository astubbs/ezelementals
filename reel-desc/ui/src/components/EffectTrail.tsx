/**
 * Scrolling heatmap of classified effects.
 * Each incoming result adds a column on the right; old columns scroll left.
 * Color = channel, brightness = intensity.
 */
import { useEffect, useRef } from 'react'
import { CHANNEL_COLOR, CHANNEL_LABEL, CHANNELS } from '../lib/colors'
import type { WsEvent } from '../lib/websocket'

interface TrailEntry {
  wind: number
  water: number
  heat_radiant: number
  heat_ambient: number
  flagged: boolean
  timestampS: number
}

interface Props {
  events: WsEvent[]
  maxEntries?: number
  height?: number
}

const ROW_HEIGHT = 20
const CELL_WIDTH = 6
const LABEL_WIDTH = 80

export function EffectTrail({ events, maxEntries = 120, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const entriesRef = useRef<TrailEntry[]>([])

  // Collect result events into entries list
  useEffect(() => {
    const results = events.filter(e => e.type === 'result')
    entriesRef.current = results.slice(-maxEntries).map(e => ({
      wind: (e.wind as number) ?? 0,
      water: (e.water as number) ?? 0,
      heat_radiant: (e.heat_radiant as number) ?? 0,
      heat_ambient: (e.heat_ambient as number) ?? 0,
      flagged: (e.flagged as boolean) ?? false,
      timestampS: (e.timestamp_s as number) ?? 0,
    }))
    redraw()
  }, [events])

  function redraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const entries = entriesRef.current
    const totalH = CHANNELS.length * ROW_HEIGHT
    canvas.height = totalH

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Background
    ctx.fillStyle = '#0f0f17'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw channel rows
    CHANNELS.forEach((ch, rowIdx) => {
      const y = rowIdx * ROW_HEIGHT
      const hex = CHANNEL_COLOR[ch]
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)

      entries.forEach((entry, colIdx) => {
        const intensity = (entry as unknown as Record<string, number>)[ch] ?? 0
        const alpha = intensity === 0 ? 0.04 : 0.15 + (intensity / 3) * 0.85
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        const x = LABEL_WIDTH + colIdx * CELL_WIDTH
        ctx.fillRect(x, y + 1, CELL_WIDTH - 1, ROW_HEIGHT - 2)

        // Flagged marker — white top border
        if (entry.flagged) {
          ctx.fillStyle = 'rgba(255,255,255,0.4)'
          ctx.fillRect(x, y + 1, CELL_WIDTH - 1, 1)
        }
      })

      // Row label
      ctx.fillStyle = hex + '99'
      ctx.font = '10px monospace'
      ctx.fillText(CHANNEL_LABEL[ch].substring(0, 10), 2, y + ROW_HEIGHT - 6)

      // Row divider
      ctx.fillStyle = '#1e1e2e'
      ctx.fillRect(0, y + ROW_HEIGHT - 1, canvas.width, 1)
    })

    // Timestamp ticks every ~10 entries
    ctx.fillStyle = '#374151'
    ctx.font = '8px monospace'
    entries.forEach((entry, i) => {
      if (i % 10 === 0) {
        const x = LABEL_WIDTH + i * CELL_WIDTH
        ctx.fillStyle = '#4B5563'
        ctx.fillRect(x, 0, 1, CHANNELS.length * ROW_HEIGHT)
        ctx.fillStyle = '#6B7280'
        ctx.fillText(fmtTime(entry.timestampS), x + 2, CHANNELS.length * ROW_HEIGHT - 2)
      }
    })
  }

  const canvasWidth = LABEL_WIDTH + maxEntries * CELL_WIDTH
  const canvasHeight = height ?? CHANNELS.length * ROW_HEIGHT

  return (
    <div className="overflow-x-auto rounded-lg bg-[#0f0f17] border border-slate-800">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="block"
      />
    </div>
  )
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}
