import { useEffect, useState } from 'react'
import { devices as devicesApi } from '../lib/api'
import type { DeviceConfig } from '../lib/api'
import { Wizard } from '../components/Wizard'
import { Trash2, Edit, Plus, Zap } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  fan: '🌀 Fan',
  mister: '💧 Mister',
  radiant_heater: '🔥 Radiant Heater',
  space_heater: '🌡️ Space Heater',
  ac: '❄️ AC',
  proxy_bulb: '💡 Proxy Bulb',
}

export default function DeviceConfig() {
  const [deviceList, setDeviceList] = useState<DeviceConfig[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [loading, setLoading] = useState(true)

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
        <button onClick={() => { /* TODO: inline add form */ }}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-medium">
          <Plus size={14} /> Add Device
        </button>
      </div>

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
                <button className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300" title="Edit">
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
