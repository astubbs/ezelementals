import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Film, Cpu, Edit3, Play, AlertTriangle, Settings as SettingsIcon, Radio } from 'lucide-react'

const Library      = lazy(() => import('./pages/Library'))
const Encoder      = lazy(() => import('./pages/Encoder'))
const EditorPage   = lazy(() => import('./pages/Editor'))
const Player       = lazy(() => import('./pages/Player'))
const ReviewQueue  = lazy(() => import('./pages/ReviewQueue'))
const DeviceConf   = lazy(() => import('./pages/DeviceConfig'))
const SettingsPage = lazy(() => import('./pages/Settings'))

const NAV = [
  { to: '/',         icon: Film,          label: 'Library'  },
  { to: '/encoder',  icon: Cpu,           label: 'Encoder'  },
  { to: '/editor',   icon: Edit3,         label: 'Editor'   },
  { to: '/player',   icon: Play,          label: 'Player'   },
  { to: '/review',   icon: AlertTriangle, label: 'Review'   },
  { to: '/devices',  icon: Radio,         label: 'Devices'  },
  { to: '/settings', icon: SettingsIcon,  label: 'Settings' },
]

function Sidebar() {
  const location = useLocation()
  return (
    <nav className="w-14 shrink-0 bg-[#0a0a13] border-r border-slate-800 flex flex-col items-center py-4 gap-1">
      <div className="text-base font-bold text-blue-400 mb-4 select-none" title="ezElementals">3E</div>
      {NAV.map(({ to, icon: Icon, label }) => {
        const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
        return (
          <NavLink key={to} to={to} title={label}
            className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg
              ${active ? 'bg-blue-900/60 text-blue-400' : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800'}`}>
            <Icon size={18} />
          </NavLink>
        )
      })}
    </nav>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-[#0f0f17] text-slate-200">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/"         element={<Library />} />
              <Route path="/encoder"  element={<Encoder />} />
              <Route path="/editor"   element={<EditorPage />} />
              <Route path="/player"   element={<Player />} />
              <Route path="/review"   element={<ReviewQueue />} />
              <Route path="/devices"  element={<DeviceConf />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  )
}
