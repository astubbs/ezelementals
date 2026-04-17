import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockDevices } from '../test/mocks/api'

vi.mock('../lib/api', () => ({
  devices: {
    list: vi.fn(),
    remove: vi.fn(),
    save: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
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

  it('shows Add Device button', async () => {
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

  it('shows edit buttons for each device', async () => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    render(<DeviceConfig />)
    await screen.findByText('Front Fan')
    const editButtons = screen.getAllByTitle('Edit')
    expect(editButtons).toHaveLength(mockDevices.length)
  })
})

describe('DeviceConfig user workflows', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('click Add Device opens form, fill + save calls devices.add', async () => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    const newDevice = { id: 'new-1', type: 'fan' as const, label: 'Rear Fan', position: 'rear-left', channel: 'wind', ha_entity: 'fan.rear', latency_ms: 0, intensity_range: [0, 3] as [number, number] }
    vi.mocked(devices.add).mockResolvedValue(newDevice)
    render(<DeviceConfig />)

    await screen.findByText('Front Fan')
    await user.click(screen.getByText('Add Device'))

    // Form should appear
    expect(screen.getByText('Add Device', { selector: 'h2' })).toBeInTheDocument()

    // Fill label and HA entity
    const labelInput = screen.getByPlaceholderText('Front Left Fan')
    await user.clear(labelInput)
    await user.type(labelInput, 'Rear Fan')

    const haInput = screen.getByPlaceholderText('fan.living_room')
    await user.clear(haInput)
    await user.type(haInput, 'fan.rear')

    // After save, mock list to include the new device
    vi.mocked(devices.list).mockResolvedValue({ devices: [...mockDevices, newDevice] })

    await user.click(screen.getByRole('button', { name: /Save/ }))

    expect(vi.mocked(devices.add)).toHaveBeenCalledTimes(1)
    const addedDevice = vi.mocked(devices.add).mock.calls[0][0]
    expect(addedDevice.label).toBe('Rear Fan')
    expect(addedDevice.ha_entity).toBe('fan.rear')
    expect(addedDevice.type).toBe('fan')

    // Form should close and list should refresh
    expect(await screen.findByText('Rear Fan')).toBeInTheDocument()
  })

  it('click Edit pre-fills form, modify + save calls devices.update', async () => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    const updated = { ...mockDevices[0], label: 'Updated Fan' }
    vi.mocked(devices.update).mockResolvedValue(updated)
    render(<DeviceConfig />)

    await screen.findByText('Front Fan')

    // Click edit on first device
    const editButtons = screen.getAllByTitle('Edit')
    await user.click(editButtons[0])

    // Form should appear with pre-filled values
    expect(screen.getByText('Edit Device')).toBeInTheDocument()
    const labelInput = screen.getByDisplayValue('Front Fan')
    expect(labelInput).toBeInTheDocument()

    // Modify the label
    await user.clear(labelInput)
    await user.type(labelInput, 'Updated Fan')

    // Mock list to reflect the update
    vi.mocked(devices.list).mockResolvedValue({ devices: [updated, ...mockDevices.slice(1)] })

    await user.click(screen.getByRole('button', { name: /Save/ }))

    expect(vi.mocked(devices.update)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(devices.update).mock.calls[0][0]).toBe('fan-front')
    expect(vi.mocked(devices.update).mock.calls[0][1].label).toBe('Updated Fan')
  })

  it('click Cancel closes form without saving', async () => {
    vi.mocked(devices.list).mockResolvedValue({ devices: mockDevices })
    render(<DeviceConfig />)

    await screen.findByText('Front Fan')
    await user.click(screen.getByText('Add Device'))

    expect(screen.getByText('Add Device', { selector: 'h2' })).toBeInTheDocument()

    // Click the text Cancel button (not the X icon button)
    await user.click(screen.getByText('Cancel', { selector: 'button' }))

    expect(screen.queryByText('Add Device', { selector: 'h2' })).not.toBeInTheDocument()
    expect(vi.mocked(devices.add)).not.toHaveBeenCalled()
  })
})
