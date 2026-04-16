import { useEffect, useState } from 'react'
import { devices as devicesApi } from '../lib/api'
import type { DeviceConfig } from '../lib/api'
import { Wizard } from '../components/Wizard'
import { Trash2, Edit, Plus, Zap, X, Save } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  fan: '🌀 Fan',
  mister: '💧 Mister',
  radiant_heater: '🔥 Radiant Heater',
  space_heater: '🌡️ Space Heater',
  ac: '❄️ AC',
  proxy_bulb: '💡 Proxy Bulb',
}

const POSITIONS = ['front-left', 'front-right', 'rear-left', 'rear-right', 'side-left', 'side-right', 'ceiling', 'ambient']

const CHANNELS = ['wind', 'water', 'heat_radiant', 'heat_ambient']

/** Default channel for each device type */
const DEFAULT_CHANNEL: Record<string, string> = {
  fan: 'wind',
  mister: 'water',
  radiant_heater: 'heat_radiant',
  space_heater: 'heat_ambient',
  ac: 'heat_ambient',
  proxy_bulb: 'wind',
}

/** Default latency (ms) for each device type */
const DEFAULT_LATENCY: Record<string, number> = {
  fan: 0,
  mister: 2500,
  radiant_heater: 1500,
  space_heater: 45000,
  ac: 210000,
  proxy_bulb: 0,
}

type FormState =
  | { mode: 'hidden' }
  | { mode: 'add' }
  | { mode: 'edit'; device: DeviceConfig }

function emptyDevice(): Omit<DeviceConfig, 'id'> {
  return {
    type: 'fan',
    label: '',
    position: 'front-left',
    channel: 'wind',
    ha_entity: '',
    latency_ms: 0,
    intensity_range: [0, 3],
  }
}

export default function DeviceConfig() {
  const [deviceList, setDeviceList] = useState<DeviceConfig[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formState, setFormState] = useState<FormState>({ mode: 'hidden' })

  function reload() {
    devicesApi.list().then(d => { setDeviceList(d.devices); setLoading(false) })
  }

  useEffect(() => { reload() }, [])

  async function remove(id: string) {
    await devicesApi.remove(id)
    reload()
  }

  if (showWizard) {
    return <Wizard onDone={() => { setShowWizard(false); reload() }} prefill={deviceList} />
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 flex-1">Devices</h1>
        <button onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800">
          <Zap size={14} /> Setup Wizard
        </button>
        <button onClick={() => setFormState({ mode: 'add' })}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-medium">
          <Plus size={14} /> Add Device
        </button>
      </div>

      {formState.mode !== 'hidden' && (
        <DeviceForm
          initial={formState.mode === 'edit' ? formState.device : emptyDevice()}
          editingId={formState.mode === 'edit' ? formState.device.id : null}
          onCancel={() => setFormState({ mode: 'hidden' })}
          onSaved={() => { setFormState({ mode: 'hidden' }); reload() }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : deviceList.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🎛️</div>
          <p className="text-slate-300 mb-2">No devices configured yet</p>
          <p className="text-slate-500 text-sm mb-4">Run the setup wizard to add your fans, heaters, and misters.</p>
          <button onClick={() => setShowWizard(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium">
            Run Setup Wizard
          </button>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          {deviceList.map((d, i) => (
            <div key={d.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-slate-900 ${i > 0 ? 'border-t border-slate-800' : ''}`}>
              <span className="text-lg w-8">{TYPE_LABELS[d.type]?.split(' ')[0]}</span>
              <div className="flex-1">
                <div className="text-sm text-slate-200 font-medium">{d.label}</div>
                <div className="text-xs text-slate-500">{d.position} · {d.channel} · {d.ha_entity}</div>
              </div>
              <div className="text-xs text-slate-600">
                {d.latency_ms > 0 ? `${d.latency_ms}ms` : 'instant'}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setFormState({ mode: 'edit', device: d })}
                  className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300" title="Edit">
                  <Edit size={13} />
                </button>
                <button onClick={() => remove(d.id)}
                  className="p-1.5 hover:bg-red-900 rounded text-slate-500 hover:text-red-400" title="Remove">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface DeviceFormProps {
  initial: Omit<DeviceConfig, 'id'> | DeviceConfig
  editingId: string | null
  onCancel: () => void
  onSaved: () => void
}

function DeviceForm({ initial, editingId, onCancel, onSaved }: DeviceFormProps) {
  const [draft, setDraft] = useState<Omit<DeviceConfig, 'id'>>({
    type: initial.type,
    label: initial.label,
    position: initial.position,
    channel: initial.channel,
    ha_entity: initial.ha_entity,
    latency_ms: initial.latency_ms,
    intensity_range: initial.intensity_range,
  })
  const [saving, setSaving] = useState(false)

  function update<K extends keyof Omit<DeviceConfig, 'id'>>(key: K, value: Omit<DeviceConfig, 'id'>[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function onTypeChange(newType: DeviceConfig['type']) {
    // Auto-set channel and latency defaults when type changes
    setDraft(d => ({
      ...d,
      type: newType,
      channel: DEFAULT_CHANNEL[newType] ?? d.channel,
      latency_ms: DEFAULT_LATENCY[newType] ?? d.latency_ms,
    }))
  }

  async function save() {
    setSaving(true)
    try {
      if (editingId) {
        await devicesApi.update(editingId, draft)
      } else {
        await devicesApi.add(draft)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const title = editingId ? 'Edit Device' : 'Add Device'

  return (
    <div className="mb-6 bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-semibold text-slate-200 flex-1">{title}</h2>
        <button onClick={onCancel} title="Cancel"
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Type</label>
          <select value={draft.type} onChange={e => onTypeChange(e.target.value as DeviceConfig['type'])}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Label</label>
          <input type="text" value={draft.label} onChange={e => update('label', e.target.value)}
            placeholder="Front Left Fan"
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Position</label>
          <select value={draft.position} onChange={e => update('position', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Channel</label>
          <select value={draft.channel} onChange={e => update('channel', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">Home Assistant entity ID</label>
          <input type="text" value={draft.ha_entity} onChange={e => update('ha_entity', e.target.value)}
            placeholder="fan.living_room"
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500" />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Latency (ms)</label>
          <input type="number" value={draft.latency_ms} onChange={e => update('latency_ms', Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <div className="flex-1" />
        <button onClick={onCancel}
          className="px-3 py-1.5 text-sm border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800">
          Cancel
        </button>
        <button onClick={save} disabled={saving || !draft.label}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg font-medium">
          <Save size={14} /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
