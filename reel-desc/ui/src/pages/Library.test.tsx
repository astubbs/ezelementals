import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { mockLibraryRoots, mockLibraryRootsWithDir, mockSettings, mockEmptySettings } from '../test/mocks/api'

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

function LocationDisplay() {
  const loc = useLocation()
  return <div data-testid="location">{loc.pathname}{loc.search}</div>
}

function renderLibrary() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Library />
      <LocationDisplay />
    </MemoryRouter>
  )
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

describe('Library user workflows', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.mocked(settings.load).mockResolvedValue(mockSettings)
  })

  it('expand/collapse a directory folder', async () => {
    vi.mocked(library.list).mockResolvedValue(mockLibraryRootsWithDir)
    renderLibrary()

    // Folder is visible but children are not
    await screen.findByText('Action')
    expect(screen.queryByText('Mad Max: Fury Road (2015)')).not.toBeInTheDocument()

    // Click folder to expand
    await user.click(screen.getByText('Action'))
    expect(await screen.findByText('Mad Max: Fury Road (2015)')).toBeInTheDocument()

    // Click folder to collapse
    await user.click(screen.getByText('Action'))
    expect(screen.queryByText('Mad Max: Fury Road (2015)')).not.toBeInTheDocument()
  })

  it('click Encode navigates to /encoder?video=...', async () => {
    vi.mocked(library.list).mockResolvedValue(mockLibraryRoots)
    renderLibrary()

    await user.click(await screen.findByText('Encode'))
    expect(screen.getByTestId('location').textContent).toBe(
      '/encoder?video=%2Fmedia%2Fnew-movie.mkv'
    )
  })

  it('click Play navigates to /player?bundle=...', async () => {
    vi.mocked(library.list).mockResolvedValue(mockLibraryRoots)
    renderLibrary()

    const playButtons = await screen.findAllByText('Play')
    await user.click(playButtons[0])
    expect(screen.getByTestId('location').textContent).toContain('/player?')
  })

  it('click Edit navigates to /editor?path=...', async () => {
    vi.mocked(library.list).mockResolvedValue(mockLibraryRoots)
    renderLibrary()

    const editButtons = await screen.findAllByText('Edit')
    await user.click(editButtons[0])
    expect(screen.getByTestId('location').textContent).toContain('/editor?path=')
  })

  it('click Review navigates to /review?path=...', async () => {
    vi.mocked(library.list).mockResolvedValue(mockLibraryRoots)
    renderLibrary()

    await user.click(await screen.findByText('Review'))
    expect(screen.getByTestId('location').textContent).toContain('/review?path=')
  })

  it('click Refresh re-calls library.list()', async () => {
    vi.mocked(library.list).mockResolvedValue(mockLibraryRoots)
    renderLibrary()

    await screen.findByText('Refresh')
    vi.mocked(library.list).mockClear()

    await user.click(screen.getByText('Refresh'))
    expect(vi.mocked(library.list)).toHaveBeenCalled()
  })
})
