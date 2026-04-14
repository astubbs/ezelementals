import { render, screen } from '@testing-library/react'
import { FrameViewer } from './FrameViewer'

describe('FrameViewer', () => {
  it('shows waiting placeholders when no frame or spectrogram', () => {
    render(<FrameViewer frame={null} spectrogram={null} frameIndex={0} timestampS={0} total={100} />)
    const waitings = screen.getAllByText('Waiting…')
    expect(waitings).toHaveLength(2)
  })

  it('renders images when base64 data is provided', () => {
    render(<FrameViewer frame="abc123" spectrogram="def456" frameIndex={5} timestampS={10.5} total={100} />)
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', 'data:image/jpeg;base64,abc123')
    expect(images[1]).toHaveAttribute('src', 'data:image/png;base64,def456')
  })

  it('displays frame index and total', () => {
    render(<FrameViewer frame={null} spectrogram={null} frameIndex={5} timestampS={10.5} total={100} />)
    expect(screen.getByText('5 / 100')).toBeInTheDocument()
  })

  it('displays timestamp', () => {
    render(<FrameViewer frame={null} spectrogram={null} frameIndex={0} timestampS={42.3} total={100} />)
    expect(screen.getByText('t = 42.3s')).toBeInTheDocument()
  })
})
