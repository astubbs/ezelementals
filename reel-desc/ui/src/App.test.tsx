import { render, screen } from '@testing-library/react'

// Mock all lazy-loaded pages to avoid loading real components that need API
vi.mock('./pages/Library', () => ({ default: () => <div>Library Page</div> }))
vi.mock('./pages/Encoder', () => ({ default: () => <div>Encoder Page</div> }))
vi.mock('./pages/Editor', () => ({ default: () => <div>Editor Page</div> }))
vi.mock('./pages/Player', () => ({ default: () => <div>Player Page</div> }))
vi.mock('./pages/ReviewQueue', () => ({ default: () => <div>ReviewQueue Page</div> }))
vi.mock('./pages/DeviceConfig', () => ({ default: () => <div>DeviceConfig Page</div> }))
vi.mock('./pages/Settings', () => ({ default: () => <div>Settings Page</div> }))

// Import after mocks
const { default: App } = await import('./App')

// App uses BrowserRouter internally, but we need MemoryRouter for tests.
// We'll test the Sidebar and route rendering separately.
function TestApp() {
  return <App />
}

describe('App shell', () => {
  it('renders all 7 navigation links', () => {
    render(<TestApp />)
    expect(screen.getByTitle('Library')).toBeInTheDocument()
    expect(screen.getByTitle('Encoder')).toBeInTheDocument()
    expect(screen.getByTitle('Editor')).toBeInTheDocument()
    expect(screen.getByTitle('Player')).toBeInTheDocument()
    expect(screen.getByTitle('Review')).toBeInTheDocument()
    expect(screen.getByTitle('Devices')).toBeInTheDocument()
    expect(screen.getByTitle('Settings')).toBeInTheDocument()
  })

  it('renders the logo', () => {
    render(<TestApp />)
    expect(screen.getByTitle('ezElementals')).toBeInTheDocument()
  })

  it('renders the default page (Library)', async () => {
    render(<TestApp />)
    expect(await screen.findByText('Library Page')).toBeInTheDocument()
  })
})
