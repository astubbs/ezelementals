import { render, screen } from '@testing-library/react'
import { DeviceRack } from './DeviceRack'
import { mockDevices } from '../../test/mocks/api'

describe('DeviceRack', () => {
  it('shows empty message when no devices', () => {
    render(<DeviceRack devices={[]} fx={null} />)
    expect(screen.getByText(/No devices configured/)).toBeInTheDocument()
    expect(screen.getByText(/set up devices/)).toBeInTheDocument()
  })

  it('groups devices by position', () => {
    render(<DeviceRack devices={mockDevices} fx={null} />)
    expect(screen.getByText('Front')).toBeInTheDocument()
    expect(screen.getByText('Ceiling')).toBeInTheDocument()
  })

  it('renders device labels', () => {
    render(<DeviceRack devices={mockDevices} fx={null} />)
    expect(screen.getByText('Front Fan')).toBeInTheDocument()
    expect(screen.getByText('Ceiling Mister')).toBeInTheDocument()
    expect(screen.getByText('Front Radiant')).toBeInTheDocument()
  })

  it('renders with active effects without crashing', () => {
    const fx = { wind: 2, water: 1, heat_radiant: 3, heat_ambient: 0 }
    const { container } = render(<DeviceRack devices={mockDevices} fx={fx} />)
    expect(container.firstChild).toBeTruthy()
  })
})
