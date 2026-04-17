/**
 * Water mist emitter widget. Drops animate falling when active.
 */
import { DeviceWidgetShell } from './DeviceWidgetShell'

interface Props { intensity: number; label: string; size?: number }

const KEYFRAMES = `
  @keyframes dropFall {
    0%   { transform: translateY(-10px); opacity: 0.8; }
    80%  { transform: translateY(16px);  opacity: 0.4; }
    100% { transform: translateY(20px);  opacity: 0; }
  }
`

export function MisterWidget({ intensity, label, size = 72 }: Props) {
  const active = intensity > 0
  const drops = intensity === 0 ? 0 : intensity === 1 ? 2 : intensity === 2 ? 4 : 6

  return (
    <DeviceWidgetShell intensity={intensity} label={label} size={size}
      channel="water" dotColor="#06B6D4" keyframes={KEYFRAMES}>
      {/* Nozzle head */}
      <rect x="24" y="8" width="24" height="12" rx="4"
        fill={active ? '#06B6D4' : '#374151'} opacity={active ? 0.9 : 0.4} />
      <rect x="30" y="20" width="12" height="6" rx="2"
        fill={active ? '#0891B2' : '#374151'} opacity={active ? 0.9 : 0.3} />
      {/* Spray drops — animated via CSS */}
      {Array.from({ length: drops }).map((_, i) => {
        const x = 20 + i * 6
        const delay = i * 0.15
        return (
          <ellipse key={i} cx={x} cy="42" rx="2" ry="5"
            fill="#06B6D4" opacity="0.7"
            style={{
              animation: active ? `dropFall 0.8s ${delay}s ease-in infinite` : 'none',
            }} />
        )
      })}
      {/* Water pool at bottom */}
      {active && (
        <ellipse cx="36" cy="66" rx="18" ry="4" fill="#06B6D4" opacity="0.2" />
      )}
    </DeviceWidgetShell>
  )
}
