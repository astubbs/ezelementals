import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { mockFxEntries, mockTimelineFrames } from '../test/mocks/api'

vi.mock('../lib/api', () => ({
  editor: {
    load: vi.fn(),
    save: vi.fn(),
    loadTimeline: vi.fn(),
    saveTimeline: vi.fn(),
    addEntry: vi.fn(),
    deleteEntry: vi.fn(),
    patchFrame: vi.fn(),
  },
}))

import Editor from './Editor'
import { editor } from '../lib/api'

function renderEditor(searchParams = '') {
  return render(
    <MemoryRouter initialEntries={[`/editor${searchParams}`]}>
      <Editor />
    </MemoryRouter>
  )
}

describe('Editor page', () => {
  it('shows "No file selected" when no path param', () => {
    renderEditor()
    expect(screen.getByText('No file selected.')).toBeInTheDocument()
  })

  it('loads .3fx file and shows entry table', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: mockFxEntries })
    renderEditor('?path=/test.3fx')
    // Wait for entries to load — timestamp appears in both timeline and table
    const timestamps = await screen.findAllByText('0:10')
    expect(timestamps.length).toBeGreaterThanOrEqual(1)
  })

  it('shows timeline badge for bundle paths', async () => {
    vi.mocked(editor.loadTimeline).mockResolvedValue({ path: '/test.bundle/timeline.jsonl', frames: mockTimelineFrames })
    renderEditor('?path=/test.bundle')
    expect(await screen.findByText('timeline')).toBeInTheDocument()
  })

  it('shows description column for bundle entries', async () => {
    vi.mocked(editor.loadTimeline).mockResolvedValue({ path: '/test.bundle/timeline.jsonl', frames: mockTimelineFrames })
    renderEditor('?path=/test.bundle')
    expect(await screen.findByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Desert landscape, clear sky')).toBeInTheDocument()
  })

  it('shows undo/redo and save buttons', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: mockFxEntries })
    renderEditor('?path=/test.3fx')
    await screen.findAllByText('0:10')
    expect(screen.getByTitle('Undo')).toBeInTheDocument()
    expect(screen.getByTitle('Redo')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('shows Add button', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: mockFxEntries })
    renderEditor('?path=/test.3fx')
    await screen.findAllByText('0:10')
    expect(screen.getByText('Add')).toBeInTheDocument()
  })

  it('shows "Click a block" message when nothing selected', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: mockFxEntries })
    renderEditor('?path=/test.3fx')
    expect(await screen.findByText('Click a block in the timeline to edit it')).toBeInTheDocument()
  })
})
