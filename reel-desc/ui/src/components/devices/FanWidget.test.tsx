import { render, screen } from '@testing-library/react'
import { FanWidget } from './FanWidget'

describe('FanWidget', () => {
  it('renders SVG with fan blades', () => {
    const { container } = render(<FanWidget intensity={0} label="Front Fan" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    // 3 blade ellipses
    const ellipses = container.querySelectorAll('ellipse')
    expect(ellipses).toHaveLength(3)
  })

  it('shows label text', () => {
    render(<FanWidget intensity={0} label="Front Fan" />)
    expect(screen.getByText('Front Fan')).toBeInTheDocument()
  })

  it('renders intensity dots', () => {
    const { container } = render(<FanWidget intensity={2} label="Fan" />)
    // 3 dots total, check they exist
    const dots = container.querySelectorAll('.rounded-full')
    // Hub circle + outer ring in SVG don't count — dots are div elements
    expect(dots.length).toBeGreaterThanOrEqual(3)
  })

  it('renders without crashing at all intensity levels', () => {
    for (const intensity of [0, 1, 2, 3]) {
      const { unmount } = render(<FanWidget intensity={intensity} label={`Fan ${intensity}`} />)
      unmount()
    }
  })
})
