/**
 * Animated fan SVG widget. Rotates at speed proportional to intensity (0-3).
 */
import { useEffect, useRef } from 'react'
import { intensityGlow } from '../../lib/colors'

interface Props { intensity: number; label: string; size?: number }

export function FanWidget({ intensity, label, size = 72 }: Props) {
  const bladeRef = useRef<SVGGElement>(null)
  const angleRef = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    // degrees per frame: 0→0, 1→1, 2→3, 3→7
    const speed = intensity === 0 ? 0 : [0, 1, 3, 7][intensity]
    let last = 0

    function tick(ts: number) {
      if (last) {
        const dt = ts - last
        angleRef.current = (angleRef.current + speed * (dt / 16)) % 360
        if (bladeRef.current) {
          bladeRef.current.setAttribute('transform', `rotate(${angleRef.current} 36 36)`)
        }
      }
      last = ts
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [intensity])

  const glow = intensityGlow('wind', intensity)
  const active = intensity > 0

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size} height={size} viewBox="0 0 72 72"
        style={{ filter: active ? `drop-shadow(${glow})` : undefined }}
      >
        {/* Hub */}
        <circle cx="36" cy="36" r="5" fill={active ? '#3B82F6' : '#374151'} />
        {/* Blades group — rotated by JS */}
        <g ref={bladeRef} transform="rotate(0 36 36)">
          {[0, 120, 240].map(angle => (
            <ellipse
              key={angle}
              cx="36" cy="20"
              rx="7" ry="14"
              fill={active ? '#3B82F6' : '#4B5563'}
              opacity={active ? 0.85 : 0.4}
              transform={`rotate(${angle} 36 36)`}
            />
          ))}
        </g>
        {/* Outer ring */}
        <circle cx="36" cy="36" r="32" fill="none"
          stroke={active ? '#3B82F6' : '#374151'}
          strokeWidth="2" opacity={active ? 0.5 : 0.2} />
      </svg>
      <span className="text-xs text-slate-400 text-center leading-tight">{label}</span>
      <IntensityDots intensity={intensity} color="#3B82F6" />
    </div>
  )
}

function IntensityDots({ intensity, color }: { intensity: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full"
          style={{ background: i <= intensity ? color : '#374151' }} />
      ))}
    </div>
  )
}
