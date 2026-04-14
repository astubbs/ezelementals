import { render } from '@testing-library/react'
import { EffectTrail } from './EffectTrail'
import type { WsEvent } from '../lib/websocket'

describe('EffectTrail', () => {
  it('renders a canvas element', () => {
    const { container } = render(<EffectTrail events={[]} />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
  })

  it('does not crash with empty events', () => {
    const { container } = render(<EffectTrail events={[]} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('does not crash with result events', () => {
    const events: WsEvent[] = [
      { type: 'result', wind: 2, water: 0, heat_radiant: 1, heat_ambient: 0, flagged: false, timestamp_s: 10 },
      { type: 'result', wind: 3, water: 1, heat_radiant: 0, heat_ambient: 2, flagged: true, timestamp_s: 20 },
    ]
    const { container } = render(<EffectTrail events={events} />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })

  it('respects maxEntries prop for canvas width', () => {
    const { container } = render(<EffectTrail events={[]} maxEntries={50} />)
    const canvas = container.querySelector('canvas')!
    // Canvas width = LABEL_WIDTH(80) + maxEntries * CELL_WIDTH(6) = 80 + 50*6 = 380
    expect(canvas.width).toBe(380)
  })
})
