import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
  useEncoderWs: () => ({
    state: {
      connected: false,
      events: [],
      latestFrame: null,
      progress: null,
      workers: {},
      done: false,
      error: null,
      currentPhase: 'idle',
      statusMessage: null,
    },
    cancel: vi.fn(),
  }),
}))

import Encoder from './Encoder'
import { devices, settings } from '../lib/api'

function renderEncoder(searchParams = '') {
  return render(
    <MemoryRouter initialEntries={[`/encoder${searchParams}`]}>
      <Encoder />
    </MemoryRouter>
  )
}

describe('Encoder page', () => {
  beforeEach(() => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    vi.mocked(settings.load).mockResolvedValue(mockSettings)
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
