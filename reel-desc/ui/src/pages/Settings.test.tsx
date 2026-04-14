import { render, screen } from '@testing-library/react'
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
