import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { mockFxEntries, mockTimelineFrames } from '../test/mocks/api'

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
    expect(screen.getByText('1 / 1')).toBeInTheDocument()  // Only 1 flagged entry in mock data
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
    // The flagged frame has description "Explosion near vehicles"
    expect(await screen.findByText('"Explosion near vehicles"')).toBeInTheDocument()
  })

  it('shows confidence for flagged bundle entries', async () => {
    vi.mocked(editor.loadTimeline).mockResolvedValue({ path: '/test.bundle/timeline.jsonl', frames: mockTimelineFrames })
    renderReview('?path=/test.bundle')
    expect(await screen.findByText('55% confidence')).toBeInTheDocument()
  })
})
