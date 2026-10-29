import { beforeEach, describe, expect, it } from 'vitest'
import { noteServerNow, clockWarning, readSkew } from './clockSkew'

const mem = new Map<string, string>()
beforeEach(() => { mem.clear(); Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) }, removeItem: (k: string) => { mem.delete(k) } } }) })

describe('v0.36.1 clock warning (Q-CRDT-1)', () => {
  it('records skew from bridge serverNow', () => {
    const local = Date.parse('2026-10-31T00:00:00.000Z')
    noteServerNow('2026-10-30T00:00:00.000Z', local)
    expect(readSkew()?.skewMs).toBe(864e5)
  })
  it('warns only beyond 10 min, in plain words', () => {
    expect(clockWarning(5 * 60e3)).toBe('')
    expect(clockWarning(864e5 + 2 * 36e5)).toBe("This phone's clock is 1 day 2 h fast. Fix Date & time in the phone's settings — the sheet corrects ticks made meanwhile.")
    expect(clockWarning(-(25 * 60e3))).toMatch(/25 min slow/)
  })
  it('ignores bad serverNow', () => {
    noteServerNow('nope', Date.now())
    expect(readSkew()).toBeNull()
  })
})
