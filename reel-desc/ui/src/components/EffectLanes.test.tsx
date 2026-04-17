import { render, screen } from '@testing-library/react'
import { EffectLanes } from './EffectLanes'
import { mockFxEntries } from '../test/mocks/api'

describe('EffectLanes', () => {
  it('renders all four channel labels', () => {
    render(<EffectLanes entries={mockFxEntries} durationS={60} />)
    expect(screen.getByText('Wind')).toBeInTheDocument()
    expect(screen.getByText('Water')).toBeInTheDocument()
    expect(screen.getByText('Radiant')).toBeInTheDocument()
    expect(screen.getByText('Ambient')).toBeInTheDocument()
  })

  it('renders without crashing with empty entries', () => {
    const { container } = render(<EffectLanes entries={[]} durationS={0} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders blocks for non-zero intensities', () => {
    const { container } = render(<EffectLanes entries={mockFxEntries} durationS={60} />)
    // Blocks have title attributes with channel info
    const blocks = container.querySelectorAll('[title]')
    expect(blocks.length).toBeGreaterThan(0)
  })

  it('renders playback cursor when currentT is provided', () => {
    const { container } = render(<EffectLanes entries={mockFxEntries} durationS={60} currentT={15} />)
    // Cursor is a white vertical bar
    const cursor = container.querySelector('.bg-white')
    expect(cursor).toBeTruthy()
  })

  it('does not render cursor when currentT is undefined', () => {
    const { container } = render(<EffectLanes entries={mockFxEntries} durationS={60} />)
    const cursor = container.querySelector('.bg-white.opacity-70')
    expect(cursor).toBeNull()
  })
})
