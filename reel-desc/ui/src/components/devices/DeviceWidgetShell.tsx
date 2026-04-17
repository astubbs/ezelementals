/**
 * Shared shell for device widgets (fan, mister, radiant heater, space
 * heater). All four share the same outer layout: a sized SVG with a
 * channel-driven drop-shadow glow, a label, and three intensity dots.
 * Only the SVG contents and optional @keyframes vary per device type.
 *
 * Extracted to fix the duplicate-code warnings flagged by jscpd on the
 * widget trio (see CI comments on PR #9).
 */

import type { Channel } from '../../lib/colors'
import { intensityGlow } from '../../lib/colors'

interface ShellProps {
  intensity: number
  label: string
  channel: Channel
  /** Hex color used for the three intensity dots under the label. */
  dotColor: string
  size?: number
  /**
   * Optional `@keyframes` CSS for SVG animations specific to this
   * widget (e.g. dropFall, heaterPulse, ambientBreath). Scoped to a
   * `<style>` tag alongside the SVG.
   */
  keyframes?: string
  /** The inner SVG contents that make this widget visually distinct. */
  children: React.ReactNode
}

export function DeviceWidgetShell({
  intensity,
  label,
  channel,
  dotColor,
  size = 72,
  keyframes,
  children,
}: ShellProps) {
  const active = intensity > 0
  const glow = intensityGlow(channel, intensity)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        viewBox="0 0 72 72"
        style={{ filter: active ? `drop-shadow(${glow})` : undefined }}
      >
        {children}
      </svg>
      {keyframes && <style>{keyframes}</style>}
      <span className="text-xs text-slate-400 text-center leading-tight">{label}</span>
      <IntensityDots intensity={intensity} color={dotColor} />
    </div>
  )
}

function IntensityDots({ intensity, color }: { intensity: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: i <= intensity ? color : '#374151' }}
        />
      ))}
    </div>
  )
}
