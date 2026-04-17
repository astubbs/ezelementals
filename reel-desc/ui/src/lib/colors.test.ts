import { CHANNELS, CHANNEL_COLOR, CHANNEL_LABEL, intensityColor, intensityGlow } from './colors'

describe('CHANNELS', () => {
  it('contains all four effect channels', () => {
    expect(CHANNELS).toEqual(['wind', 'water', 'heat_radiant', 'heat_ambient'])
  })

  it('has a color for every channel', () => {
    for (const ch of CHANNELS) {
      expect(CHANNEL_COLOR[ch]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('has a label for every channel', () => {
    for (const ch of CHANNELS) {
      expect(CHANNEL_LABEL[ch]).toBeTruthy()
    }
  })
})

describe('intensityColor', () => {
  it('returns fully transparent for intensity 0', () => {
    expect(intensityColor('wind', 0)).toContain(',0.00)')
  })

  it('returns partial opacity for intensity 1', () => {
    const result = intensityColor('wind', 1)
    expect(result).toMatch(/^rgba\(\d+,\d+,\d+,0\.\d+\)$/)
    // intensity 1: opacity = 0.2 + (1/3) * 0.8 ≈ 0.47
    expect(result).toContain('59,130,246')  // blue-500 RGB
  })

  it('returns near-full opacity for intensity 3', () => {
    const result = intensityColor('heat_radiant', 3)
    expect(result).toContain(',1.00)')
    expect(result).toContain('239,68,68')  // red-500 RGB
  })
})

describe('intensityGlow', () => {
  it('returns "none" for intensity 0', () => {
    expect(intensityGlow('wind', 0)).toBe('none')
  })

  it('returns a box-shadow string for intensity > 0', () => {
    const result = intensityGlow('water', 2)
    expect(result).toMatch(/^0 0 \d+px rgba\(/)
    expect(result).toContain('6,182,212')  // cyan-500 RGB
  })

  it('scales spread with intensity', () => {
    const low = intensityGlow('wind', 1)
    const high = intensityGlow('wind', 3)
    const spreadLow = parseInt(low.match(/0 0 (\d+)px/)![1])
    const spreadHigh = parseInt(high.match(/0 0 (\d+)px/)![1])
    expect(spreadHigh).toBeGreaterThan(spreadLow)
  })
})
