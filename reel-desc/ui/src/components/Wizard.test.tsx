import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Wizard } from './Wizard'

vi.mock('../lib/api', () => ({
  devices: {
    save: vi.fn().mockResolvedValue({ devices: [] }),
  },
}))

describe('Wizard', () => {
  const onDone = vi.fn()

  it('renders step 1 (Fans) by default', () => {
    render(<Wizard onDone={onDone} />)
    expect(screen.getByText(/Fans/)).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
  })

  it('shows 5 step indicators', () => {
    render(<Wizard onDone={onDone} />)
    // Step indicators are numbered circles
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows enable toggle', () => {
    render(<Wizard onDone={onDone} />)
    expect(screen.getByText(/I have fans/i)).toBeInTheDocument()
  })

  it('navigates to next step', async () => {
    const user = userEvent.setup()
    render(<Wizard onDone={onDone} />)
    await user.click(screen.getByText('Next'))
    expect(screen.getByText(/Misters/)).toBeInTheDocument()
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument()
  })

  it('navigates back', async () => {
    const user = userEvent.setup()
    render(<Wizard onDone={onDone} />)
    await user.click(screen.getByText('Next'))
    expect(screen.getByText(/Misters/)).toBeInTheDocument()
    await user.click(screen.getByText('Back'))
    expect(screen.getByText(/Fans/)).toBeInTheDocument()
  })

  it('Back button is disabled on step 1', () => {
    render(<Wizard onDone={onDone} />)
    const backBtn = screen.getByText('Back').closest('button')!
    expect(backBtn).toBeDisabled()
  })

  it('shows Finish button on last step', async () => {
    const user = userEvent.setup()
    render(<Wizard onDone={onDone} />)
    // Navigate to step 5
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByText('Next'))
    }
    expect(screen.getByText('Finish')).toBeInTheDocument()
    expect(screen.getByText(/Proxy Bulbs/)).toBeInTheDocument()
  })

  it('all 5 step titles are reachable', async () => {
    const user = userEvent.setup()
    render(<Wizard onDone={onDone} />)
    const titles = ['Fans', 'Misters', 'Radiant Heaters', 'Ambient Heaters / AC', 'Proxy Bulbs (optional)']
    for (let i = 0; i < titles.length; i++) {
      expect(screen.getByText(new RegExp(titles[i].replace(/[()]/g, '\\$&')))).toBeInTheDocument()
      if (i < titles.length - 1) await user.click(screen.getByText('Next'))
    }
  })
})
