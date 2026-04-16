import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('DeviceConfig user workflows', () => {
  const user = userEvent.setup()

  it('click Remove calls devices.remove(), device disappears', async () => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    vi.mocked(devices.remove).mockResolvedValue({ deleted: 'fan-front' })
    render(<DeviceConfig />)

    await screen.findByText('Front Fan')
    const removeButtons = screen.getAllByTitle('Remove')

    // After remove, mock list to return without the first device
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices.slice(1) })

    await user.click(removeButtons[0])
    expect(vi.mocked(devices.remove)).toHaveBeenCalledWith('fan-front')

    // After reload, Front Fan should be gone
    expect(await screen.findByText('Ceiling Mister')).toBeInTheDocument()
    expect(screen.queryByText('Front Fan')).not.toBeInTheDocument()
  })

  it('click Setup Wizard renders wizard component', async () => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    vi.mocked(devices.save).mockResolvedValue({ devices: [] })
    render(<DeviceConfig />)

    await user.click(await screen.findByText('Setup Wizard'))

    // Wizard first step should appear
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
    // Device list should be gone
    expect(screen.queryByText('Front Fan')).not.toBeInTheDocument()
  })
})
