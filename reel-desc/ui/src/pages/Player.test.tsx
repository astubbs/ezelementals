import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { mockFxEntries, mockDevices } from '../test/mocks/api'

vi.mock('../lib/api', () => ({
  editor: {
    load: vi.fn(),
  },
  player: {
    state: vi.fn(),
    lookup: vi.fn(),
  },
  devices: {
    list: vi.fn(),
  },
}))

import Player from './Player'
import { editor, player, devices } from '../lib/api'

function renderPlayer(searchParams = '') {
  return render(
    <MemoryRouter initialEntries={[`/player${searchParams}`]}>
      <Player />
    </MemoryRouter>
  )
}

describe('Player page', () => {
  beforeEach(() => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: mockFxEntries })
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
  })

  it('shows "No track selected" when no fx param', () => {
    renderPlayer()
    expect(screen.getByText('No track selected.')).toBeInTheDocument()
  })

  it('shows filename when fx param is provided', async () => {
    renderPlayer('?fx=/media/fury-road.3fx')
    expect(await screen.findByText('fury-road.3fx')).toBeInTheDocument()
  })

  it('shows HA offline indicator initially', async () => {
    renderPlayer('?fx=/media/fury-road.3fx')
    expect(await screen.findByText('HA offline')).toBeInTheDocument()
  })

  it('shows transport bar with placeholder time', async () => {
    renderPlayer('?fx=/media/fury-road.3fx')
    expect(await screen.findByText('--:--:--')).toBeInTheDocument()
  })

  it('shows Devices section', async () => {
    renderPlayer('?fx=/media/fury-road.3fx')
    expect(await screen.findByText('Devices')).toBeInTheDocument()
  })

  it('shows Track Overview section', async () => {
    renderPlayer('?fx=/media/fury-road.3fx')
    expect(await screen.findByText('Track Overview')).toBeInTheDocument()
  })

  it('explains HA controls playback', async () => {
    renderPlayer('?fx=/media/fury-road.3fx')
    expect(await screen.findByText(/Playback controlled by Home Assistant/)).toBeInTheDocument()
  })
})

describe('Player user workflows', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: mockFxEntries })
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('HA polling updates position and shows connected state', async () => {
    vi.mocked(player.state).mockResolvedValue({
      position_s: 42,
      ha_available: true,
      current_fx: { t: 10, wind: 2, water: 0, heat_ambient: 1, heat_radiant: 0, next_change_t: 50 },
    })

    await act(async () => {
      renderPlayer('?fx=/media/fury-road.3fx')
    })

    // Wait for initial load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(screen.getByText('HA connected')).toBeInTheDocument()
    expect(screen.getByText('00:00:42')).toBeInTheDocument()
  })

  it('HA offline when polling fails', async () => {
    vi.mocked(player.state).mockRejectedValue(new Error('connection refused'))

    await act(async () => {
      renderPlayer('?fx=/media/fury-road.3fx')
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    // Should still show offline
    expect(screen.getByText('HA offline')).toBeInTheDocument()
  })
})
