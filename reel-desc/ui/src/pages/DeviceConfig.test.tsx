import { render, screen } from '@testing-library/react'
import { mockDevices } from '../test/mocks/api'

vi.mock('../lib/api', () => ({
  devices: {
    list: vi.fn(),
    remove: vi.fn(),
    save: vi.fn(),
  },
}))

import DeviceConfig from './DeviceConfig'
import { devices } from '../lib/api'

describe('DeviceConfig page', () => {
  it('shows empty state when no devices', async () => {
    vi.mocked(devices.list).mockResolvedValue({ devices: [] })
    render(<DeviceConfig />)
    expect(await screen.findByText('No devices configured yet')).toBeInTheDocument()
    expect(screen.getByText('Run Setup Wizard')).toBeInTheDocument()
  })

  it('shows device list with labels and positions', async () => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    render(<DeviceConfig />)
    expect(await screen.findByText('Front Fan')).toBeInTheDocument()
    expect(screen.getByText('Ceiling Mister')).toBeInTheDocument()
    expect(screen.getByText('Front Radiant')).toBeInTheDocument()
  })

  it('shows Setup Wizard button', async () => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    render(<DeviceConfig />)
    expect(await screen.findByText('Setup Wizard')).toBeInTheDocument()
  })

  it('shows Add Device button (handler is TODO)', async () => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    render(<DeviceConfig />)
    expect(await screen.findByText('Add Device')).toBeInTheDocument()
  })

  it('shows remove buttons for each device', async () => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    render(<DeviceConfig />)
    await screen.findByText('Front Fan')
    const removeButtons = screen.getAllByTitle('Remove')
    expect(removeButtons).toHaveLength(mockDevices.length)
  })

  it('shows edit buttons for each device (handler is TODO)', async () => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    render(<DeviceConfig />)
    await screen.findByText('Front Fan')
    const editButtons = screen.getAllByTitle('Edit')
    expect(editButtons).toHaveLength(mockDevices.length)
  })
})
