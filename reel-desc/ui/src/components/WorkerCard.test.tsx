import { render, screen } from '@testing-library/react'
import { WorkerCard } from './WorkerCard'

describe('WorkerCard', () => {
  it('shows idle state when no worker state', () => {
    render(<WorkerCard workerId={0} url="http://localhost:11434" model="qwen2.5-vl:7b" state={undefined} />)
    expect(screen.getByText('Idle')).toBeInTheDocument()
    expect(screen.getByText('Worker 1')).toBeInTheDocument()
  })

  it('shows frame info when state is provided', () => {
    render(<WorkerCard workerId={1} url="http://localhost:11434" model="qwen2.5-vl:7b"
      state={{ frameIndex: 42, timestampS: 84.0 }} />)
    expect(screen.getByText('Worker 2')).toBeInTheDocument()
    expect(screen.getByText('frame 42 · t=84.0s')).toBeInTheDocument()
  })

  it('shows confidence when result has it', () => {
    render(<WorkerCard workerId={0} url="http://localhost:11434" model="qwen2.5-vl:7b"
      state={{
        frameIndex: 10,
        timestampS: 20.0,
        lastResult: { type: 'result', wind: 2, water: 0, heat_radiant: 1, heat_ambient: 0, confidence: 0.92, flagged: false },
      }} />)
    expect(screen.getByText('✓ conf 92%')).toBeInTheDocument()
  })

  it('shows flagged warning for low confidence', () => {
    render(<WorkerCard workerId={0} url="http://localhost:11434" model="qwen2.5-vl:7b"
      state={{
        frameIndex: 10,
        timestampS: 20.0,
        lastResult: { type: 'result', wind: 1, water: 0, heat_radiant: 0, heat_ambient: 0, confidence: 0.5, flagged: true },
      }} />)
    expect(screen.getByText('⚠ conf 50%')).toBeInTheDocument()
  })

  it('shows VLM description when provided', () => {
    render(<WorkerCard workerId={0} url="http://localhost:11434" model="qwen2.5-vl:7b"
      state={{
        frameIndex: 10,
        timestampS: 20.0,
        lastDescription: 'Desert sandstorm approaching',
      }} />)
    expect(screen.getByText('Desert sandstorm approaching')).toBeInTheDocument()
  })

  it('displays URL and model', () => {
    render(<WorkerCard workerId={0} url="http://gpu-server:11434" model="qwen2.5-vl:32b" state={undefined} />)
    expect(screen.getByText('http://gpu-server:11434')).toBeInTheDocument()
    expect(screen.getByText('qwen2.5-vl:32b')).toBeInTheDocument()
  })
})
