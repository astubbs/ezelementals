import { render, screen } from '@testing-library/react'
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
import { editor, devices } from '../lib/api'

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
