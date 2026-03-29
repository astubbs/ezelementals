/**
 * Element channel colours and intensity → opacity mapping.
 * Used consistently across EffectTrail, EffectLanes, device widgets, etc.
 */

export type Channel = 'wind' | 'water' | 'heat_radiant' | 'heat_ambient'

export const CHANNEL_COLOR: Record<Channel, string> = {
  wind:         '#3B82F6', // blue-500
  water:        '#06B6D4', // cyan-500
  heat_radiant: '#EF4444', // red-500
  heat_ambient: '#F59E0B', // amber-500
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  wind:         'Wind',
  water:        'Water',
  heat_radiant: 'Radiant heat',
  heat_ambient: 'Ambient heat',
}

export const CHANNEL_ICON: Record<Channel, string> = {
  wind:         '💨',
  water:        '💧',
  heat_radiant: '🔥',
  heat_ambient: '🌡️',
}

export const CHANNELS: Channel[] = ['wind', 'water', 'heat_radiant', 'heat_ambient']

/** Convert intensity 0-3 to a CSS rgba string */
export function intensityColor(channel: Channel, intensity: number): string {
  const hex = CHANNEL_COLOR[channel]
  const opacity = intensity === 0 ? 0 : 0.2 + (intensity / 3) * 0.8
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity.toFixed(2)})`
}

/** Tailwind-compatible glow shadow for a given intensity */
export function intensityGlow(channel: Channel, intensity: number): string {
  if (intensity === 0) return 'none'
  const hex = CHANNEL_COLOR[channel]
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const spread = intensity * 6
  const alpha = 0.3 + (intensity / 3) * 0.5
  return `0 0 ${spread}px rgba(${r},${g},${b},${alpha})`
}
