/**
 * DeviceRack renders all configured devices, grouped by position row,
 * with intensity driven by the current FxEntry.
 */
import type { DeviceConfig, FxEntry } from '../../lib/api'
import { FanWidget } from './FanWidget'
import { MisterWidget } from './MisterWidget'
import { RadiantHeaterWidget } from './RadiantHeaterWidget'
import { SpaceHeaterWidget } from './SpaceHeaterWidget'

interface Props {
  devices: DeviceConfig[]
  fx: Partial<FxEntry> | null
}

function channelIntensity(fx: Partial<FxEntry> | null, channel: string): number {
  if (!fx) return 0
  return (fx as Record<string, number>)[channel] ?? 0
}

function DeviceWidget({ device, intensity }: { device: DeviceConfig; intensity: number }) {
  switch (device.type) {
    case 'fan':
      return <FanWidget intensity={intensity} label={device.label} />
    case 'mister':
      return <MisterWidget intensity={intensity} label={device.label} />
    case 'radiant_heater':
      return <RadiantHeaterWidget intensity={intensity} label={device.label} />
    case 'space_heater':
    case 'ac':
      return <SpaceHeaterWidget intensity={intensity} label={device.label} />
    case 'proxy_bulb': {
      const color = device.channel === 'wind' ? '#3B82F6'
        : device.channel === 'water' ? '#06B6D4'
        : device.channel === 'heat_radiant' ? '#EF4444' : '#F59E0B'
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl"
            style={{
              borderColor: intensity > 0 ? color : '#374151',
              background: intensity > 0 ? `${color}22` : 'transparent',
              boxShadow: intensity > 0 ? `0 0 ${intensity * 8}px ${color}66` : 'none',
            }}>
            💡
          </div>
          <span className="text-xs text-slate-400 text-center leading-tight">{device.label}</span>
        </div>
      )
    }
    default:
      return null
  }
}

// Group by a normalised position row label
const POSITION_LABEL: Record<string, string> = {
  'ceiling': 'Ceiling',
  'front-left': 'Front',
  'front-right': 'Front',
  'front': 'Front',
  'side-left': 'Sides',
  'side-right': 'Sides',
  'rear-left': 'Rear',
  'rear-right': 'Rear',
  'rear': 'Rear',
  'ambient': 'Ambient',
}

export function DeviceRack({ devices, fx }: Props) {
  if (devices.length === 0) {
    return (
      <div className="text-slate-500 text-sm text-center py-4">
        No devices configured — <a href="/devices" className="text-blue-400 hover:underline">set up devices</a>
      </div>
    )
  }

  // Group devices by display row
  const rows: Record<string, DeviceConfig[]> = {}
  for (const d of devices) {
    const row = POSITION_LABEL[d.position] ?? d.position
    if (!rows[row]) rows[row] = []
    rows[row].push(d)
  }

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(rows).map(([rowLabel, rowDevices]) => (
        <div key={rowLabel}>
          <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">{rowLabel}</div>
          <div className="flex flex-wrap gap-6">
            {rowDevices.map(d => (
              <DeviceWidget
                key={d.id}
                device={d}
                intensity={channelIntensity(fx, d.channel)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
