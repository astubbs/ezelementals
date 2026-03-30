import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { library, settings } from '../lib/api'
import type { LibraryEntry, LibraryFileEntry, LibraryRoot, Settings } from '../lib/api'
import { Film, Folder, FolderOpen, Play, Edit, RefreshCw, CheckCircle, AlertCircle, Clock, Circle } from 'lucide-react'

export default function Library() {
  const [roots, setRoots] = useState<LibraryRoot[]>([])
  const [appSettings, setAppSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([library.list(), settings.load()])
      .then(([lib, s]) => { setRoots(lib.roots); setAppSettings(s) })
      .finally(() => setLoading(false))
  }, [])

  function refresh() {
    setLoading(true)
    library.list().then(lib => setRoots(lib.roots)).finally(() => setLoading(false))
  }

  if (loading) return <LoadingSpinner />

  if (!appSettings?.media_roots?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <div className="text-4xl">🎬</div>
        <h2 className="text-xl font-semibold text-slate-200">No media folders configured</h2>
        <p className="text-slate-400 max-w-sm">Add a folder containing your movie files to get started.</p>
        <button onClick={() => navigate('/settings')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium">
          Open Settings
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Library</h1>
        <button onClick={refresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg hover:border-slate-500">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {roots.map(root => (
        <div key={root.root} className="mb-8">
          <div className="text-xs text-slate-500 font-mono mb-3 uppercase tracking-wider">{root.root}</div>
          {root.error
            ? <div className="text-red-400 text-sm">{root.error}</div>
            : <EntryList entries={root.entries} expanded={expanded} setExpanded={setExpanded} navigate={navigate} />
          }
        </div>
      ))}
    </div>
  )
}

function EntryList({ entries, expanded, setExpanded, navigate }: {
  entries: LibraryEntry[]
  expanded: Set<string>
  setExpanded: (s: Set<string>) => void
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      {entries.map((entry, i) => (
        <div key={entry.path} className={i > 0 ? 'border-t border-slate-800' : ''}>
          {entry.type === 'dir' ? (
            <DirRow entry={entry} expanded={expanded} setExpanded={setExpanded} navigate={navigate} />
          ) : (
            <FileRow entry={entry} navigate={navigate} />
          )}
        </div>
      ))}
    </div>
  )
}

function DirRow({ entry, expanded, setExpanded, navigate }: {
  entry: { type: 'dir'; name: string; path: string; children: LibraryEntry[] }
  expanded: Set<string>
  setExpanded: (s: Set<string>) => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const open = expanded.has(entry.path)
  function toggle() {
    const next = new Set(expanded)
    open ? next.delete(entry.path) : next.add(entry.path)
    setExpanded(next)
  }
  return (
    <>
      <button onClick={toggle}
        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 text-left">
        {open ? <FolderOpen size={16} className="text-yellow-400 shrink-0" />
               : <Folder size={16} className="text-yellow-400 shrink-0" />}
        <span>{entry.name}</span>
        <span className="ml-auto text-xs text-slate-600">{entry.children.length} item{entry.children.length !== 1 ? 's' : ''}</span>
      </button>
      {open && (
        <div className="pl-6 border-l border-slate-800 ml-4">
          <EntryList entries={entry.children} expanded={expanded} setExpanded={setExpanded} navigate={navigate} />
        </div>
      )}
    </>
  )
}

function FileRow({ entry, navigate }: { entry: LibraryFileEntry; navigate: ReturnType<typeof useNavigate> }) {
  const { status, flagged_count, path, fx_path, name } = entry

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-900">
      <Film size={16} className="text-slate-500 shrink-0" />
      <span className="text-sm text-slate-200 flex-1 truncate" title={path}>{name}</span>
      <StatusBadge status={status} flaggedCount={flagged_count} />
      <div className="flex items-center gap-1 shrink-0">
        {(status === 'encoded' || status === 'flagged') && (
          <>
            <ActionBtn icon={<Play size={13} />} label="Play"
              onClick={() => navigate(`/player?fx=${encodeURIComponent(fx_path)}`)} />
            <ActionBtn icon={<Edit size={13} />} label="Edit"
              onClick={() => navigate(`/editor?path=${encodeURIComponent(fx_path)}`)} />
          </>
        )}
        {status === 'flagged' && (
          <ActionBtn icon={<AlertCircle size={13} />} label="Review" accent
            onClick={() => navigate(`/review?path=${encodeURIComponent(fx_path)}`)} />
        )}
        <ActionBtn
          icon={<RefreshCw size={13} />}
          label={status === 'not_encoded' ? 'Encode' : 'Re-encode'}
          onClick={() => navigate(`/encoder?video=${encodeURIComponent(path)}`)} />
      </div>
    </div>
  )
}

function StatusBadge({ status, flaggedCount }: { status: string; flaggedCount: number }) {
  if (status === 'encoded')
    return <span className="flex items-center gap-1 text-xs text-green-400 shrink-0"><CheckCircle size={12} /> Encoded</span>
  if (status === 'flagged')
    return <span className="flex items-center gap-1 text-xs text-yellow-400 shrink-0"><AlertCircle size={12} /> {flaggedCount} flagged</span>
  if (status === 'in_progress')
    return <span className="flex items-center gap-1 text-xs text-blue-400 shrink-0 animate-pulse"><Clock size={12} /> In progress</span>
  return <span className="flex items-center gap-1 text-xs text-slate-500 shrink-0"><Circle size={12} /> Not encoded</span>
}

function ActionBtn({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
        ${accent
          ? 'text-yellow-400 hover:bg-yellow-400/10 border border-yellow-800'
          : 'text-slate-400 hover:bg-slate-700 border border-slate-700'}`}>
      {icon}{label}
    </button>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
