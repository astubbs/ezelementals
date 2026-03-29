/**
 * React hook for the encoder WebSocket stream.
 * Returns all received events and a cancel function.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export type WsEventType =
  | 'frame_start'
  | 'frame_image'
  | 'result'
  | 'progress'
  | 'done'
  | 'cancelled'
  | 'error'
  | 'status'

export interface WsEvent {
  type: WsEventType
  [key: string]: unknown
}

export interface EncoderState {
  connected: boolean
  events: WsEvent[]
  latestFrame: { frame: string | null; spectrogram: string | null; worker: number; frameIndex: number; timestampS: number } | null
  progress: { completed: number; total: number; etaS: number | null } | null
  workers: Record<number, { frameIndex: number; timestampS: number; lastResult?: WsEvent; inferenceMs?: number }>
  done: boolean
  error: string | null
}

const EMPTY: EncoderState = {
  connected: false,
  events: [],
  latestFrame: null,
  progress: null,
  workers: {},
  done: false,
  error: null,
}

export function useEncoderWs(jobId: string | null) {
  const [state, setState] = useState<EncoderState>(EMPTY)
  const wsRef = useRef<WebSocket | null>(null)

  const cancel = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'cancel' }))
  }, [])

  useEffect(() => {
    if (!jobId) { setState(EMPTY); return }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/encoder/${jobId}`)
    wsRef.current = ws

    ws.onopen = () => setState(s => ({ ...s, connected: true }))

    ws.onmessage = (e) => {
      const event: WsEvent = JSON.parse(e.data)
      setState(s => {
        const next = { ...s, events: [...s.events.slice(-500), event] }

        if (event.type === 'frame_image' && event.kind === 'frame') {
          next.latestFrame = {
            frame: event.data as string,
            spectrogram: s.latestFrame?.spectrogram ?? null,
            worker: event.worker as number,
            frameIndex: event.frame_index as number,
            timestampS: 0,
          }
        }
        if (event.type === 'frame_image' && event.kind === 'spectrogram') {
          next.latestFrame = {
            ...(s.latestFrame ?? { frame: null, worker: 0, frameIndex: 0, timestampS: 0 }),
            spectrogram: event.data as string,
          }
        }
        if (event.type === 'frame_start') {
          const w = event.worker as number
          next.workers = {
            ...s.workers,
            [w]: { frameIndex: event.frame_index as number, timestampS: event.timestamp_s as number },
          }
        }
        if (event.type === 'result') {
          const w = event.worker as number
          next.workers = {
            ...s.workers,
            [w]: { ...(s.workers[w] ?? {}), lastResult: event },
          }
        }
        if (event.type === 'progress') {
          next.progress = {
            completed: event.completed as number,
            total: event.total as number,
            etaS: event.eta_s as number | null,
          }
        }
        if (event.type === 'done' || event.type === 'cancelled') {
          next.done = true
        }
        if (event.type === 'error') {
          next.error = event.message as string
        }
        return next
      })
    }

    ws.onclose = () => setState(s => ({ ...s, connected: false }))
    ws.onerror = () => setState(s => ({ ...s, error: 'WebSocket error', connected: false }))

    return () => ws.close()
  }, [jobId])

  return { state, cancel }
}
