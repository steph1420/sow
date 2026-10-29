import { afterEach, describe, expect, it, vi } from 'vitest'
import { HAPTIC_MS, haptic, setHapticsEnabled } from './haptics'

afterEach(() => setHapticsEnabled(true))

describe('haptics (t169u)', () => {
  it('pulses per kind when enabled', () => {
    const v = vi.fn((_ms: number) => true)
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { vibrate: v } })
    haptic('az'); haptic('tick'); haptic('commit')
    expect(v.mock.calls.map((c) => c[0])).toEqual([HAPTIC_MS.az, HAPTIC_MS.tick, HAPTIC_MS.commit])
    expect(HAPTIC_MS).toMatchObject({ az: 8, tick: 10, commit: 15 })
  })
  it('no-op when disabled or unsupported (iOS Safari)', () => {
    const v = vi.fn((_ms: number) => true)
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { vibrate: v } })
    setHapticsEnabled(false); haptic('tick')
    expect(v).not.toHaveBeenCalled()
    setHapticsEnabled(true)
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
    expect(() => haptic('tick')).not.toThrow()
  })
})
