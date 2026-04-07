import { intensityGlow } from '../../lib/colors'

interface Props { intensity: number; label: string; size?: number }

export function MisterWidget({ intensity, label, size = 72 }: Props) {
  const active = intensity > 0
  const glow = intensityGlow('water', intensity)
  const drops = intensity === 0 ? 0 : intensity === 1 ? 2 : intensity === 2 ? 4 : 6

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 72 72"
        style={{ filter: active ? `drop-shadow(${glow})` : undefined }}>
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
      </svg>
      <style>{`
        @keyframes dropFall {
          0%   { transform: translateY(-10px); opacity: 0.8; }
          80%  { transform: translateY(16px);  opacity: 0.4; }
          100% { transform: translateY(20px);  opacity: 0; }
        }
      `}</style>
      <span className="text-xs text-slate-400 text-center leading-tight">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full"
            style={{ background: i <= intensity ? '#06B6D4' : '#374151' }} />
        ))}
      </div>
    </div>
  )
}
