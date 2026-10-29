import { afterEach, describe, expect, it, vi } from 'vitest'
import { HAPTIC, haptic, scalePattern, setHapticsLevel } from './haptics'

afterEach(() => setHapticsLevel('normal'))
const mockNav = () => {
  const v = vi.fn((_p: number | number[]) => true)
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { vibrate: v } })
  return v
}

describe('haptics v0.29 graded palette (t170u)', () => {
  it('palette strengths', () => {
    expect(HAPTIC.selection).toBe(7)
    expect(HAPTIC.light).toBe(10)
    expect(HAPTIC.medium).toBe(18)
    expect(HAPTIC.heavy).toBe(30)
    expect(HAPTIC.success).toEqual([12, 40, 12])
    expect(HAPTIC.error).toEqual([30, 60, 30])
  })
  it('Normal plays palette as-is', () => {
    const v = mockNav()
    haptic('selection'); haptic('medium'); haptic('success')
    expect(v.mock.calls.map((c) => c[0])).toEqual([7, 18, [12, 40, 12]])
  })
  it('Light / Strong scale pulse durations, never gaps', () => {
    expect(scalePattern(18, 'light')).toBe(11)
    expect(scalePattern(18, 'strong')).toBe(27)
    expect(scalePattern([12, 40, 12], 'strong')).toEqual([18, 40, 18])
    expect(scalePattern(7, 'light')).toBeGreaterThanOrEqual(4)
  })
  it('Off / unsupported = silent no-throw', () => {
    const v = mockNav()
    setHapticsLevel('off'); haptic('heavy')
    expect(v).not.toHaveBeenCalled()
    setHapticsLevel('normal')
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
    expect(() => haptic('light')).not.toThrow()
  })
})
