import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { mockSettings } from '../test/mocks/api'

vi.mock('../lib/api', () => ({
  settings: {
    load: vi.fn(),
    save: vi.fn(),
  },
}))

import Settings from './Settings'
import { settings } from '../lib/api'

function renderSettings() {
  return render(<MemoryRouter><Settings /></MemoryRouter>)
}

describe('Settings page', () => {
  beforeEach(() => {
    vi.mocked(settings.load).mockResolvedValue(mockSettings)
    vi.mocked(settings.save).mockResolvedValue(mockSettings)
  })

  it('renders all section headings', async () => {
    renderSettings()
    expect(await screen.findByText('Media Folders')).toBeInTheDocument()
    expect(screen.getByText('Ollama Instances')).toBeInTheDocument()
    expect(screen.getByText('Home Assistant')).toBeInTheDocument()
    expect(screen.getByText('Encoding Defaults')).toBeInTheDocument()
    expect(screen.getByText('Device Setup')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
  })

  it('shows media roots from settings', async () => {
    renderSettings()
    const input = await screen.findByDisplayValue('/media')
    expect(input).toBeInTheDocument()
  })

  it('shows Ollama instance URL', async () => {
    renderSettings()
    expect(await screen.findByDisplayValue('http://localhost:11434')).toBeInTheDocument()
  })

  it('shows HA base URL', async () => {
    renderSettings()
    expect(await screen.findByDisplayValue('http://homeassistant.local:8123')).toBeInTheDocument()
  })

  it('shows encoding defaults', async () => {
    renderSettings()
    expect(await screen.findByText('Two-pass mode')).toBeInTheDocument()
    expect(screen.getByText('Stub LLM (no GPU needed)')).toBeInTheDocument()
  })

  it('shows theme selector', async () => {
    renderSettings()
    expect(await screen.findByText('dark')).toBeInTheDocument()
    expect(screen.getByText('light')).toBeInTheDocument()
  })

  it('shows Save button', async () => {
    renderSettings()
    expect(await screen.findByText('Save')).toBeInTheDocument()
  })
})

describe('Settings user workflows', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.mocked(settings.load).mockResolvedValue(JSON.parse(JSON.stringify(mockSettings)))
    vi.mocked(settings.save).mockResolvedValue(mockSettings)
  })

  it('add media folder — new input appears', async () => {
    renderSettings()
    await screen.findByDisplayValue('/media')

    // Count textbox inputs before
    const before = screen.getAllByRole('textbox').length

    await user.click(screen.getByText('Add folder'))

    // One more textbox should exist
    const after = screen.getAllByRole('textbox').length
    expect(after).toBe(before + 1)
  })

  it('remove media folder — input disappears', async () => {
    renderSettings()
    await screen.findByDisplayValue('/media')

    // Click the trash button next to the media root
    const trashButtons = screen.getAllByRole('button').filter(btn => {
      const svg = btn.querySelector('.lucide-trash-2')
      return svg !== null
    })
    await user.click(trashButtons[0])

    expect(screen.queryByDisplayValue('/media')).not.toBeInTheDocument()
  })

  it('toggle two-pass mode — value flips', async () => {
    renderSettings()
    await screen.findByText('Two-pass mode')

    // Find the toggle button next to "Two-pass mode"
    const twoPasLabel = screen.getByText('Two-pass mode')
    const toggle = twoPasLabel.parentElement!.querySelector('button')!

    // Initially off (bg-slate-700)
    expect(toggle.className).toContain('bg-slate-700')

    await user.click(toggle)

    // Now on (bg-blue-600)
    expect(toggle.className).toContain('bg-blue-600')
  })

  it('click Save calls settings.save() with state, shows feedback', async () => {
    renderSettings()
    await screen.findByText('Save')

    await user.click(screen.getByText('Save'))
    expect(vi.mocked(settings.save)).toHaveBeenCalledTimes(1)

    // After save resolves, shows "✓ Saved"
    expect(await screen.findByText('✓ Saved')).toBeInTheDocument()
  })
})
