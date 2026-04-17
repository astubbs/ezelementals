import '@testing-library/jest-dom'

// Mock canvas getContext — jsdom doesn't implement canvas
HTMLCanvasElement.prototype.getContext = (() => ({
  fillRect: () => {},
  clearRect: () => {},
  fillText: () => {},
  measureText: () => ({ width: 0 }),
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  set fillStyle(_v: string) {},
  set strokeStyle(_v: string) {},
  set font(_v: string) {},
  set textAlign(_v: string) {},
  set textBaseline(_v: string) {},
  set lineWidth(_v: number) {},
  set globalAlpha(_v: number) {},
})) as unknown as typeof HTMLCanvasElement.prototype.getContext

// Mock requestAnimationFrame for animation components (FanWidget etc.)
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0) as unknown as number
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
}

// Mock WebSocket for useEncoderWs hook
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState = MockWebSocket.OPEN
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    // Auto-fire onopen in next tick
    setTimeout(() => this.onopen?.(new Event('open')), 0)
  }

  send(_data: string) {}
  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }
}

Object.assign(MockWebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
})

globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket
