import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { mockLibraryRoots, mockSettings, mockEmptySettings } from '../test/mocks/api'

// Mock API module
vi.mock('../lib/api', () => ({
  library: {
    list: vi.fn(),
  },
  settings: {
    load: vi.fn(),
  },
}))

import Library from './Library'
import { library, settings } from '../lib/api'

function renderLibrary() {
  return render(<MemoryRouter><Library /></MemoryRouter>)
}

describe('Library page', () => {
  it('shows "No media folders configured" when settings has empty media_roots', async () => {
    vi.mocked(library.list).mockResolvedValue({ roots: [] })
    vi.mocked(settings.load).mockResolvedValue(mockEmptySettings)

    renderLibrary()
    expect(await screen.findByText('No media folders configured')).toBeInTheDocument()
    expect(screen.getByText('Open Settings')).toBeInTheDocument()
  })

  it('renders file list with entries', async () => {
    vi.mocked(library.list).mockResolvedValue(mockLibraryRoots)
    vi.mocked(settings.load).mockResolvedValue(mockSettings)

    renderLibrary()
    // Film title should appear instead of filename
    expect(await screen.findByText('Mad Max: Fury Road (2015)')).toBeInTheDocument()
    expect(screen.getByText('Dunkirk (2017)')).toBeInTheDocument()
  })

  it('shows status badges', async () => {
    vi.mocked(library.list).mockResolvedValue(mockLibraryRoots)
    vi.mocked(settings.load).mockResolvedValue(mockSettings)

    renderLibrary()
    expect(await screen.findByText('Bundle')).toBeInTheDocument()
    expect(screen.getByText('5 flagged')).toBeInTheDocument()
    expect(screen.getByText('Not encoded')).toBeInTheDocument()
  })

  it('shows Encode button for unencoded files', async () => {
    vi.mocked(library.list).mockResolvedValue(mockLibraryRoots)
    vi.mocked(settings.load).mockResolvedValue(mockSettings)

    renderLibrary()
    expect(await screen.findByText('Encode')).toBeInTheDocument()
  })

  it('shows Play and Edit buttons for encoded files', async () => {
    vi.mocked(library.list).mockResolvedValue(mockLibraryRoots)
    vi.mocked(settings.load).mockResolvedValue(mockSettings)

    renderLibrary()
    const playButtons = await screen.findAllByText('Play')
    expect(playButtons.length).toBeGreaterThanOrEqual(1)
    const editButtons = screen.getAllByText('Edit')
    expect(editButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows Review button for flagged files', async () => {
    vi.mocked(library.list).mockResolvedValue(mockLibraryRoots)
    vi.mocked(settings.load).mockResolvedValue(mockSettings)

    renderLibrary()
    expect(await screen.findByText('Review')).toBeInTheDocument()
  })

  it('shows Refresh button', async () => {
    vi.mocked(library.list).mockResolvedValue(mockLibraryRoots)
    vi.mocked(settings.load).mockResolvedValue(mockSettings)

    renderLibrary()
    expect(await screen.findByText('Refresh')).toBeInTheDocument()
  })
})
