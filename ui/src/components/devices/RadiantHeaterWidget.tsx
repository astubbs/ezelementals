import { intensityGlow } from '../../lib/colors'

interface Props { intensity: number; label: string; size?: number }

export function RadiantHeaterWidget({ intensity, label, size = 72 }: Props) {
  const active = intensity > 0
  const glow = intensityGlow('heat_radiant', intensity)
  const bars = 4
  // pulse speed: 0→none, 1→slow, 2→medium, 3→fast
  const pulseDuration = intensity === 0 ? '0s' : intensity === 1 ? '2s' : intensity === 2 ? '1.2s' : '0.6s'
  const barColor = intensity === 3 ? '#EF4444' : intensity === 2 ? '#F97316' : '#F59E0B'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 72 72"
        style={{ filter: active ? `drop-shadow(${glow})` : undefined }}>
        {/* Frame */}
        <rect x="8" y="14" width="56" height="44" rx="4"
          fill="#1e1e2e" stroke={active ? barColor : '#374151'} strokeWidth="1.5" opacity="0.8" />
        {/* Heating elements (horizontal bars) */}
        {Array.from({ length: bars }).map((_, i) => (
          <rect key={i}
            x="14" y={20 + i * 9} width="44" height="5" rx="2"
            fill={active ? barColor : '#374151'}
            opacity={active ? 0.9 : 0.3}
            style={active ? {
              animation: `heaterPulse ${pulseDuration} ${i * 0.1}s ease-in-out infinite alternate`,
            } : undefined} />
        ))}
        {/* Warm glow overlay */}
        {active && (
          <rect x="8" y="14" width="56" height="44" rx="4"
            fill={barColor} opacity="0.05"
            style={{ animation: `heaterPulse ${pulseDuration} ease-in-out infinite alternate` }} />
        )}
      </svg>
      <style>{`
        @keyframes heaterPulse {
          from { opacity: 0.6; }
          to   { opacity: 1.0; }
        }
      `}</style>
      <span className="text-xs text-slate-400 text-center leading-tight">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full"
            style={{ background: i <= intensity ? '#EF4444' : '#374151' }} />
        ))}
      </div>
    </div>
  )
}
