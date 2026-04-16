/**
 * Space heater / AC widget. A slow ambient "breath" (pulsing glow)
 * signals sustained ambient heat, distinct from radiant's sharper
 * per-bar pulse.
 */
import { DeviceWidgetShell } from './DeviceWidgetShell'

interface Props { intensity: number; label: string; size?: number }

const KEYFRAMES = `
  @keyframes ambientBreath {
    from { opacity: 0.4; }
    to   { opacity: 1.0; }
  }
`

export function SpaceHeaterWidget({ intensity, label, size = 72 }: Props) {
  const active = intensity > 0
  const ambientColor = '#F59E0B'
  const glowOpacity = intensity === 0 ? 0 : 0.05 + (intensity / 3) * 0.15

  return (
    <DeviceWidgetShell intensity={intensity} label={label} size={size}
      channel="heat_ambient" dotColor="#F59E0B" keyframes={KEYFRAMES}>
      {/* Outer ambient glow */}
      {active && (
        <circle cx="36" cy="36" r="34" fill={ambientColor} opacity={glowOpacity}
          style={{ animation: 'ambientBreath 3s ease-in-out infinite alternate' }} />
      )}
      {/* Heater body */}
      <rect x="14" y="16" width="44" height="40" rx="6"
        fill="#1e1e2e"
        stroke={active ? ambientColor : '#374151'}
        strokeWidth="1.5" opacity={active ? 0.9 : 0.5} />
      {/* Grille lines */}
      {[24, 30, 36, 42, 48].map(y => (
        <line key={y} x1="20" y1={y} x2="52" y2={y}
          stroke={active ? ambientColor : '#4B5563'}
          strokeWidth="1.5" opacity={active ? 0.6 : 0.25} />
      ))}
      {/* Indicator light */}
      <circle cx="36" cy="62" r="3"
        fill={active ? ambientColor : '#374151'}
        opacity={active ? 0.9 : 0.3}
        style={active ? { animation: 'ambientBreath 2s ease-in-out infinite alternate' } : undefined} />
    </DeviceWidgetShell>
  )
}
