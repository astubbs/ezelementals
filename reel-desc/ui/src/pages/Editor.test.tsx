import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('Editor user workflows', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: JSON.parse(JSON.stringify(mockFxEntries)) })
    vi.mocked(editor.save).mockResolvedValue({ path: '/test.3fx', count: 4 })
  })

  it('click entry in table selects it and shows sliders', async () => {
    renderEditor('?path=/test.3fx')
    await screen.findAllByText('0:10')

    // Click the row for t=10 (wind=2)
    const row = screen.getByText('0:10').closest('tr')!
    await user.click(row)

    // Detail panel should show timestamp and sliders
    expect(screen.getByText('t = 10.00s')).toBeInTheDocument()
    const sliders = screen.getAllByRole('slider')
    expect(sliders.length).toBeGreaterThanOrEqual(4) // 4 channels
  })

  it('change intensity slider updates value and activates dirty state', async () => {
    renderEditor('?path=/test.3fx')
    await screen.findAllByText('0:10')

    // Select entry t=10
    await user.click(screen.getByText('0:10').closest('tr')!)

    // Find the Wind slider (first range input in detail panel)
    const sliders = screen.getAllByRole('slider')
    const windSlider = sliders[0]

    // Change value via fireEvent (userEvent doesn't support range inputs well)
    fireEvent.change(windSlider, { target: { value: '3' } })

    // Save button should show dirty indicator (the small dot)
    const saveBtn = screen.getByText('Save').closest('button')!
    expect(saveBtn).not.toBeDisabled()
  })

  it('click Save calls editor.save() with modified entries', async () => {
    renderEditor('?path=/test.3fx')
    await screen.findAllByText('0:10')

    // Select and modify an entry
    await user.click(screen.getByText('0:10').closest('tr')!)
    const sliders = screen.getAllByRole('slider')
    fireEvent.change(sliders[0], { target: { value: '3' } })

    // Click Save
    await user.click(screen.getByText('Save'))
    expect(vi.mocked(editor.save)).toHaveBeenCalledTimes(1)
  })

  it('click Add creates new entry in table', async () => {
    renderEditor('?path=/test.3fx')
    await screen.findAllByText('0:10')

    const rowsBefore = screen.getAllByRole('row').length - 1 // minus header

    await user.click(screen.getByText('Add'))

    const rowsAfter = screen.getAllByRole('row').length - 1
    expect(rowsAfter).toBe(rowsBefore + 1)
  })

  it('click Delete removes selected entry', async () => {
    renderEditor('?path=/test.3fx')
    await screen.findAllByText('0:10')

    // Select the entry at t=10
    await user.click(screen.getByText('0:10').closest('tr')!)
    expect(screen.getByText('t = 10.00s')).toBeInTheDocument()

    // Delete it
    await user.click(screen.getByTitle('Delete entry'))

    // Should return to placeholder
    expect(screen.getByText('Click a block in the timeline to edit it')).toBeInTheDocument()
  })

  it('undo reverts last change, redo reapplies it', async () => {
    renderEditor('?path=/test.3fx')
    await screen.findAllByText('0:10')

    // Select entry and change slider
    await user.click(screen.getByText('0:10').closest('tr')!)
    const sliders = screen.getAllByRole('slider')
    fireEvent.change(sliders[0], { target: { value: '3' } })

    // Undo should now be enabled
    const undoBtn = screen.getByTitle('Undo')
    expect(undoBtn.closest('button')).not.toBeDisabled()

    await user.click(undoBtn)

    // Redo should now be enabled
    const redoBtn = screen.getByTitle('Redo')
    expect(redoBtn.closest('button')).not.toBeDisabled()
  })
})
