import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { mockFxEntries, mockTimelineFrames, mockMultiFlaggedFxEntries } from '../test/mocks/api'

vi.mock('../lib/api', () => ({
  editor: {
    load: vi.fn(),
    save: vi.fn(),
    loadTimeline: vi.fn(),
    patchFrame: vi.fn(),
  },
}))

import ReviewQueue from './ReviewQueue'
import { editor } from '../lib/api'

function renderReview(searchParams = '') {
  return render(
    <MemoryRouter initialEntries={[`/review${searchParams}`]}>
      <ReviewQueue />
    </MemoryRouter>
  )
}

describe('ReviewQueue page', () => {
  it('shows "No file selected" when no path param', () => {
    renderReview()
    expect(screen.getByText('No file selected.')).toBeInTheDocument()
  })

  it('shows "No flagged frames" when track has no flagged entries', async () => {
    const unflagged = mockFxEntries.map(e => ({ ...e, flagged: false }))
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: unflagged })
    renderReview('?path=/test.3fx')
    expect(await screen.findByText('No flagged frames')).toBeInTheDocument()
  })

  it('shows review UI for flagged entries', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: mockFxEntries })
    renderReview('?path=/test.3fx')
    expect(await screen.findByText('Review Queue')).toBeInTheDocument()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
  })

  it('shows Accept and Skip buttons', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: mockFxEntries })
    renderReview('?path=/test.3fx')
    expect(await screen.findByText(/Accept/)).toBeInTheDocument()
    expect(screen.getByText('Skip')).toBeInTheDocument()
  })

  it('shows intensity sliders', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: mockFxEntries })
    renderReview('?path=/test.3fx')
    expect(await screen.findByText('Correct values')).toBeInTheDocument()
  })

  it('shows frame image unavailable placeholders', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: mockFxEntries })
    renderReview('?path=/test.3fx')
    expect(await screen.findByText(/Frame image unavailable/)).toBeInTheDocument()
    expect(screen.getByText('Spectrogram unavailable')).toBeInTheDocument()
  })

  it('shows VLM description for bundle entries', async () => {
    vi.mocked(editor.loadTimeline).mockResolvedValue({ path: '/test.bundle/timeline.jsonl', frames: mockTimelineFrames })
    renderReview('?path=/test.bundle')
    expect(await screen.findByText('"Explosion near vehicles"')).toBeInTheDocument()
  })

  it('shows confidence for flagged bundle entries', async () => {
    vi.mocked(editor.loadTimeline).mockResolvedValue({ path: '/test.bundle/timeline.jsonl', frames: mockTimelineFrames })
    renderReview('?path=/test.bundle')
    expect(await screen.findByText('55% confidence')).toBeInTheDocument()
  })
})

describe('ReviewQueue user workflows', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accept calls API save and advances to next entry', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: JSON.parse(JSON.stringify(mockMultiFlaggedFxEntries)) })
    vi.mocked(editor.save).mockResolvedValue({ path: '/test.3fx', count: 4 })
    renderReview('?path=/test.3fx')

    // First flagged entry displayed (t=10)
    expect(await screen.findByText('1 / 2')).toBeInTheDocument()

    // Click Accept
    await user.click(screen.getByText(/Accept/))

    expect(vi.mocked(editor.save)).toHaveBeenCalledTimes(1)
    // Should advance to second flagged entry
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('skip advances without saving', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: JSON.parse(JSON.stringify(mockMultiFlaggedFxEntries)) })
    renderReview('?path=/test.3fx')

    expect(await screen.findByText('1 / 2')).toBeInTheDocument()

    await user.click(screen.getByText('Skip'))

    expect(vi.mocked(editor.save)).not.toHaveBeenCalled()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('prev/next navigation between flagged frames', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: JSON.parse(JSON.stringify(mockMultiFlaggedFxEntries)) })
    renderReview('?path=/test.3fx')

    expect(await screen.findByText('1 / 2')).toBeInTheDocument()

    // Navigate to next
    const nextButtons = screen.getAllByRole('button')
    const nextBtn = nextButtons.find(btn => btn.querySelector('.lucide-chevron-right'))!
    await user.click(nextBtn)
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    // Navigate back
    const prevBtn = nextButtons.find(btn => btn.querySelector('.lucide-chevron-left'))!
    await user.click(prevBtn)
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('accepted count updates after accepting entries', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: JSON.parse(JSON.stringify(mockMultiFlaggedFxEntries)) })
    vi.mocked(editor.save).mockResolvedValue({ path: '/test.3fx', count: 4 })
    renderReview('?path=/test.3fx')

    await screen.findByText('1 / 2')

    // Accept first
    await user.click(screen.getByText(/Accept/))
    expect(screen.getByText('1 remaining')).toBeInTheDocument()
  })

  it('accepting all flagged entries shows "Review complete" screen', async () => {
    vi.mocked(editor.load).mockResolvedValue({ path: '/test.3fx', entries: JSON.parse(JSON.stringify(mockMultiFlaggedFxEntries)) })
    vi.mocked(editor.save).mockResolvedValue({ path: '/test.3fx', count: 4 })
    renderReview('?path=/test.3fx')

    // 2 flagged entries — accept both
    await screen.findByText('1 / 2')
    await user.click(screen.getByText(/Accept/))
    await screen.findByText('2 / 2')
    await user.click(screen.getByText(/Accept/))

    // After accepting the last one, idx advances past flagged.length and
    // the completion guard renders
    expect(await screen.findByText('Review complete')).toBeInTheDocument()
    expect(screen.getByText('Accepted 2 of 2 flagged frames.')).toBeInTheDocument()
  })
})
