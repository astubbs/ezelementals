/** Typed wrappers around the FastAPI REST endpoints. */

const BASE = '/api'

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const r = await fetch(url.toString())
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`)
  return r.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(`POST ${path} → ${r.status}`)
  return r.json()
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(BASE + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`PUT ${path} → ${r.status}`)
  return r.json()
}

async function del<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path, { method: 'DELETE' })
  if (!r.ok) throw new Error(`DELETE ${path} → ${r.status}`)
  return r.json()
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface FxEntry {
  t: number
  wind: number
  water: number
  heat_ambient: number
  heat_radiant: number
  flagged?: boolean
}

export interface LibraryFileEntry {
  type: 'file'
  name: string
  path: string
  fx_path: string
  status: 'not_encoded' | 'encoded' | 'flagged' | 'in_progress'
  flagged_count: number
}

export interface LibraryDirEntry {
  type: 'dir'
  name: string
  path: string
  children: LibraryEntry[]
}

export type LibraryEntry = LibraryFileEntry | LibraryDirEntry

export interface LibraryRoot {
  root: string
  entries: LibraryEntry[]
  error?: string
}

export interface DeviceConfig {
  id: string
  type: 'fan' | 'mister' | 'radiant_heater' | 'space_heater' | 'ac' | 'proxy_bulb'
  label: string
  position: string
  channel: string
  ha_entity: string
  latency_ms: number
  intensity_range: [number, number]
  binary?: boolean
  proxy?: boolean
}

export interface Settings {
  media_roots: string[]
  ollama_instances: { url: string; model: string; role: string }[]
  ha: { base_url: string; token: string; media_player_entity: string }
  encoding_defaults: { fps: number; confidence_threshold: number; two_pass: boolean; stub_llm: boolean }
  ui: { theme: string; notify_on_complete: boolean }
}

// ── Library ──────────────────────────────────────────────────────────────────

export const library = {
  list: (root?: string) => get<{ roots: LibraryRoot[] }>('/library', root ? { root } : undefined),
  status: (path: string) => get<LibraryFileEntry>('/library/status', { path }),
}

// ── Encoder ──────────────────────────────────────────────────────────────────

export interface StartEncodeRequest {
  video_path: string
  output_path?: string
  fps?: number
  ollama_url?: string
  model?: string
  confidence_threshold?: number
  stub_llm?: boolean
  workers?: { url: string; model: string }[]
}

export const encoder = {
  start: (req: StartEncodeRequest) => post<{ job_id: string; status: string }>('/encoder/start', req),
  cancel: (jobId: string) => post<{ job_id: string; status: string }>(`/encoder/${jobId}/cancel`),
  status: (jobId: string) => get<{ job_id: string; status: string; progress: { completed: number; total: number }; flagged_count: number; output_path: string | null; error: string | null }>(`/encoder/${jobId}/status`),
  list: () => get<{ jobs: { job_id: string; status: string; progress: { completed: number; total: number }; video_path: string }[] }>('/encoder'),
}

// ── Editor ───────────────────────────────────────────────────────────────────

export const editor = {
  load: (path: string) => get<{ path: string; entries: FxEntry[] }>('/editor', { path }),
  save: (path: string, entries: FxEntry[]) => put<{ path: string; count: number }>(`/editor?path=${encodeURIComponent(path)}`, entries),
  addEntry: (path: string, entry: FxEntry) => post<{ added: FxEntry }>(`/editor/entry?path=${encodeURIComponent(path)}`, entry),
  deleteEntry: (path: string, t: number) => del<{ deleted_at: number }>(`/editor/entry?path=${encodeURIComponent(path)}&t=${t}`),
}

// ── Player ───────────────────────────────────────────────────────────────────

export const player = {
  state: (fxPath: string) => get<{ position_s: number | null; ha_available: boolean; current_fx: (FxEntry & { next_change_t: number | null }) | null }>('/player/state', { fx_path: fxPath }),
  lookup: (fxPath: string, t: number) => get<{ t: number; fx: FxEntry | null }>('/player/lookup', { fx_path: fxPath, t: String(t) }),
}

// ── Devices ──────────────────────────────────────────────────────────────────

export const devices = {
  list: () => get<{ devices: DeviceConfig[] }>('/devices'),
  save: (data: { devices: DeviceConfig[] }) => put<{ devices: DeviceConfig[] }>('/devices', data),
  add: (device: Omit<DeviceConfig, 'id'>) => post<DeviceConfig>('/devices', device),
  update: (id: string, device: Partial<DeviceConfig>) => put<DeviceConfig>(`/devices/${id}`, device),
  remove: (id: string) => del<{ deleted: string }>(`/devices/${id}`),
}

// ── Settings ─────────────────────────────────────────────────────────────────

export const settings = {
  load: () => get<Settings>('/settings'),
  save: (data: Settings) => put<Settings>('/settings', data),
}
