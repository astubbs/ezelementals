import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { mockDevices, mockSettings } from '../test/mocks/api'

vi.mock('../lib/api', () => ({
  encoder: {
    start: vi.fn(),
    cancel: vi.fn(),
    status: vi.fn(),
    list: vi.fn(),
  },
  devices: {
    list: vi.fn(),
  },
  settings: {
    load: vi.fn(),
  },
}))

vi.mock('../lib/websocket', () => ({
  useEncoderWs: vi.fn(),
}))

import Encoder from './Encoder'
import { encoder, devices, settings } from '../lib/api'
import { useEncoderWs } from '../lib/websocket'

const idleState = {
  connected: false,
  events: [],
  latestFrame: null,
  progress: null,
  workers: {},
  done: false,
  error: null,
  currentPhase: 'idle' as const,
  statusMessage: null,
}

function LocationDisplay() {
  const loc = useLocation()
  return <div data-testid="location">{loc.pathname}{loc.search}</div>
}

function renderEncoder(searchParams = '') {
  return render(
    <MemoryRouter initialEntries={[`/encoder${searchParams}`]}>
      <Encoder />
      <LocationDisplay />
    </MemoryRouter>
  )
}

describe('Encoder page', () => {
  beforeEach(() => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    vi.mocked(settings.load).mockResolvedValue(mockSettings)
    vi.mocked(useEncoderWs).mockReturnValue({ state: idleState, cancel: vi.fn() })
  })

  it('shows "No video selected" when no video param', () => {
    renderEncoder()
    expect(screen.getByText(/No video selected/)).toBeInTheDocument()
    expect(screen.getByText('Go to Library')).toBeInTheDocument()
  })

  it('shows filename and Start Encode button when video is selected', async () => {
    renderEncoder('?video=/media/fury-road.mkv')
    expect(await screen.findByText('fury-road.mkv')).toBeInTheDocument()
    expect(screen.getByText('Start Encode')).toBeInTheDocument()
  })

  it('shows Film info toggle button', async () => {
    renderEncoder('?video=/media/fury-road.mkv')
    expect(await screen.findByText(/Film info/)).toBeInTheDocument()
  })

  it('shows Live Device Preview section', async () => {
    renderEncoder('?video=/media/fury-road.mkv')
    expect(await screen.findByText('Live Device Preview')).toBeInTheDocument()
  })

  it('shows Effect Trail section', async () => {
    renderEncoder('?video=/media/fury-road.mkv')
    expect(await screen.findByText('Effect Trail')).toBeInTheDocument()
  })
})

describe('Encoder user workflows', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    vi.mocked(settings.load).mockResolvedValue(mockSettings)
    vi.mocked(useEncoderWs).mockReturnValue({ state: idleState, cancel: vi.fn() })
  })

  it('click Start Encode calls encoder.start() with correct params', async () => {
    vi.mocked(encoder.start).mockResolvedValue({ job_id: 'j1', status: 'started' })
    renderEncoder('?video=/media/fury-road.mkv')

    await user.click(await screen.findByText('Start Encode'))

    expect(vi.mocked(encoder.start)).toHaveBeenCalledTimes(1)
    const call = vi.mocked(encoder.start).mock.calls[0][0]
    expect(call.video_path).toBe('/media/fury-road.mkv')
    expect(call.fps).toBe(0.5)
    expect(call.confidence_threshold).toBe(0.7)
  })

  it('progress state shows frame count and ETA', async () => {
    const progressState = {
      ...idleState,
      connected: true,
      progress: { completed: 42, total: 100, etaS: 120 },
      currentPhase: 'classifying' as const,
    }
    vi.mocked(useEncoderWs).mockReturnValue({ state: progressState, cancel: vi.fn() })
    vi.mocked(encoder.start).mockResolvedValue({ job_id: 'j1', status: 'started' })

    renderEncoder('?video=/media/fury-road.mkv')
    await user.click(await screen.findByText('Start Encode'))

    expect(screen.getByText('42 / 100 frames')).toBeInTheDocument()
    expect(screen.getByText('ETA 2m')).toBeInTheDocument()
  })

  it('cancel button calls cancel function', async () => {
    const cancelFn = vi.fn()
    const runningState = { ...idleState, connected: true, currentPhase: 'classifying' as const }
    vi.mocked(useEncoderWs).mockReturnValue({ state: runningState, cancel: cancelFn })
    vi.mocked(encoder.start).mockResolvedValue({ job_id: 'j1', status: 'started' })

    renderEncoder('?video=/media/fury-road.mkv')
    await user.click(await screen.findByText('Start Encode'))

    await user.click(screen.getByText('Cancel'))
    expect(cancelFn).toHaveBeenCalled()
  })

  it('done state shows Open in Editor button with correct path', async () => {
    const doneState = {
      ...idleState,
      connected: true,
      done: true,
      currentPhase: 'done' as const,
      events: [{ type: 'done' as const, output_path: '/output/fury-road.bundle', flagged_count: 3 }],
    }
    vi.mocked(useEncoderWs).mockReturnValue({ state: doneState, cancel: vi.fn() })
    vi.mocked(encoder.start).mockResolvedValue({ job_id: 'j1', status: 'started' })

    renderEncoder('?video=/media/fury-road.mkv')
    await user.click(await screen.findByText('Start Encode'))

    await user.click(screen.getByText('Open in Editor'))
    expect(screen.getByTestId('location').textContent).toContain('/editor?path=')
  })
})
