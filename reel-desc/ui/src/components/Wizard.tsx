/**
 * First-run / re-run device setup wizard.
 * 5 steps: Fans → Misters → Radiant heaters → Space heaters/AC → Proxy bulbs.
 * Pre-fills from existing device config if provided.
 */
import { useState } from 'react'
import { devices as devicesApi } from '../lib/api'
import type { DeviceConfig } from '../lib/api'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

interface Props {
  onDone: () => void
  prefill?: DeviceConfig[]
}

interface WizardDevice {
  enabled: boolean
  count: number
  items: Partial<DeviceConfig>[]
}

const DEFAULT_LATENCY: Record<string, number> = {
  fan: 0,
  mister: 2500,
  radiant_heater: 1500,
  space_heater: 45000,
  ac: 210000,
}

const POSITIONS = ['front-left', 'front-right', 'rear-left', 'rear-right', 'side-left', 'side-right', 'ceiling', 'ambient']

export function Wizard({ onDone, prefill = [] }: Props) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  function prefillType(type: string): Partial<DeviceConfig>[] {
    return prefill.filter(d => d.type === type)
  }

  const [fans, setFans] = useState<WizardDevice>({
    enabled: prefill.some(d => d.type === 'fan'),
    count: prefillType('fan').length || 1,
    items: prefillType('fan').length ? prefillType('fan') : [{ type: 'fan' as const, position: 'front-left', channel: 'wind', latency_ms: 0, intensity_range: [0, 1] as [number, number], label: 'Fan 1', ha_entity: '' }],
  })
  const [misters, setMisters] = useState<WizardDevice>({
    enabled: prefill.some(d => d.type === 'mister'),
    count: prefillType('mister').length || 1,
    items: prefillType('mister').length ? prefillType('mister') : [{ type: 'mister' as const, position: 'ceiling', channel: 'water', latency_ms: 2500, intensity_range: [0, 1] as [number, number], label: 'Mister', ha_entity: '' }],
  })
  const [radiant, setRadiant] = useState<WizardDevice>({
    enabled: prefill.some(d => d.type === 'radiant_heater'),
    count: prefillType('radiant_heater').length || 1,
    items: prefillType('radiant_heater').length ? prefillType('radiant_heater') : [{ type: 'radiant_heater' as const, position: 'front-left', channel: 'heat_radiant', latency_ms: 1500, intensity_range: [0, 1] as [number, number], label: 'Radiant Heater', ha_entity: '' }],
  })
  const [ambient, setAmbient] = useState<WizardDevice>({
    enabled: prefill.some(d => d.type === 'space_heater' || d.type === 'ac'),
    count: prefillType('space_heater').length + prefillType('ac').length || 1,
    items: [...prefillType('space_heater'), ...prefillType('ac')].length
      ? [...prefillType('space_heater'), ...prefillType('ac')]
      : [{ type: 'space_heater' as const, position: 'ambient', channel: 'heat_ambient', latency_ms: 45000, intensity_range: [0, 1] as [number, number], label: 'Space Heater', ha_entity: '' }],
  })
  const [proxies, setProxies] = useState<WizardDevice>({
    enabled: prefill.some(d => d.type === 'proxy_bulb'),
    count: prefillType('proxy_bulb').length || 1,
    items: prefillType('proxy_bulb').length ? prefillType('proxy_bulb') : [{ type: 'proxy_bulb' as const, position: 'ambient', channel: 'wind', latency_ms: 0, intensity_range: [0, 1] as [number, number], label: 'Proxy Bulb', ha_entity: '' }],
  })

  const steps = [
    { title: 'Fans', icon: '🌀', state: fans, setState: setFans, type: 'fan', channel: 'wind' },
    { title: 'Misters', icon: '💧', state: misters, setState: setMisters, type: 'mister', channel: 'water' },
    { title: 'Radiant Heaters', icon: '🔥', state: radiant, setState: setRadiant, type: 'radiant_heater', channel: 'heat_radiant' },
    { title: 'Ambient Heaters / AC', icon: '🌡️', state: ambient, setState: setAmbient, type: 'space_heater', channel: 'heat_ambient' },
    { title: 'Proxy Bulbs (optional)', icon: '💡', state: proxies, setState: setProxies, type: 'proxy_bulb', channel: 'wind' },
  ]

  async function finish() {
    setSaving(true)
    const allDevices: Partial<DeviceConfig>[] = [
      ...(fans.enabled ? fans.items : []),
      ...(misters.enabled ? misters.items : []),
      ...(radiant.enabled ? radiant.items : []),
      ...(ambient.enabled ? ambient.items : []),
      ...(proxies.enabled ? proxies.items : []),
    ]
    await devicesApi.save({ devices: allDevices as DeviceConfig[] })
    setSaving(false)
    onDone()
  }

  const current = steps[step]

  function updateItem(idx: number, field: string, value: unknown) {
    current.setState((prev: WizardDevice) => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }))
  }

  function setCount(n: number) {
    current.setState((prev: WizardDevice) => {
      const items = [...prev.items]
      while (items.length < n) items.push({ type: current.type as DeviceConfig['type'], position: 'front-left', channel: current.channel, latency_ms: DEFAULT_LATENCY[current.type] ?? 0, intensity_range: [0, 1] as [number, number], label: `${current.title} ${items.length + 1}`, ha_entity: '' })
      return { ...prev, count: n, items: items.slice(0, n) }
    })
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((_s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${i < step ? 'bg-green-600 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`h-px w-8 ${i < step ? 'bg-green-600' : 'bg-slate-700'}`} />}
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold text-slate-100 mb-1">
        {current.icon} {current.title}
      </h2>
      <p className="text-slate-400 text-sm mb-6">Step {step + 1} of {steps.length}</p>

      {/* Enable toggle */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => current.setState((p: WizardDevice) => ({ ...p, enabled: !p.enabled }))}
          className={`relative w-11 h-6 rounded-full transition-colors ${current.state.enabled ? 'bg-blue-600' : 'bg-slate-700'}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${current.state.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
        <span className="text-slate-300 text-sm">I have {current.title.toLowerCase()}</span>
      </div>

      {current.state.enabled && (
        <>
          {/* Count selector */}
          <div className="mb-4">
            <label className="text-xs text-slate-500 uppercase tracking-wider block mb-2">How many?</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setCount(n)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold border ${current.state.count === n ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Per-device fields */}
          {current.state.items.slice(0, current.state.count).map((item, i) => (
            <div key={i} className="bg-slate-900 rounded-lg p-4 border border-slate-800 mb-3">
              <div className="text-sm text-slate-300 font-medium mb-3">{current.title} {i + 1}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Label</label>
                  <input type="text" value={item.label ?? ''} onChange={e => updateItem(i, 'label', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Position</label>
                  <select value={item.position ?? 'front-left'} onChange={e => updateItem(i, 'position', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">Home Assistant entity ID</label>
                  <input type="text" value={item.ha_entity ?? ''} onChange={e => updateItem(i, 'ha_entity', e.target.value)}
                    placeholder="input_number.fan_front_left"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Latency (ms)</label>
                  <input type="number" value={item.latency_ms ?? 0} onChange={e => updateItem(i, 'latency_ms', Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-6">
        <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
          className="flex items-center gap-1 px-4 py-2 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-30 text-sm">
          <ChevronLeft size={15} /> Back
        </button>
        <div className="flex-1" />
        {step < steps.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-1 px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium">
            Next <ChevronRight size={15} />
          </button>
        ) : (
          <button onClick={finish} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 rounded-lg text-sm font-medium">
            <Check size={15} /> {saving ? 'Saving…' : 'Finish'}
          </button>
        )}
      </div>
    </div>
  )
}
