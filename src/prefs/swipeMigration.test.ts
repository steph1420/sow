import { beforeEach, describe, expect, it } from 'vitest'
import { loadPrefs, savePrefs, PREFS_DEFAULTS } from './appPrefs'
import { migrateRemoteSwipeStyle } from './swipeMigration'

// v0.46.0-beta.2 (Steve t15u Q2): a saved 'blue' swipe cue becomes trailing wash once; choosing blue afterwards sticks.
describe('swipe cue migration blue → wash', () => {
  const mem = new Map<string, string>()
  beforeEach(() => {
    mem.clear()
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) }, removeItem: (k: string) => { mem.delete(k) }, clear: () => mem.clear() } })
  })
  it('a device with saved blue moves to wash once', () => {
    savePrefs({ ...PREFS_DEFAULTS, 'gestures.swipeConfirmStyle': 'blue' })
    expect(loadPrefs()['gestures.swipeConfirmStyle']).toBe('wash')
    savePrefs({ ...loadPrefs(), 'gestures.swipeConfirmStyle': 'blue' }) // Steve picks blue again later
    expect(loadPrefs()['gestures.swipeConfirmStyle']).toBe('blue')
  })
  it('other saved styles are untouched', () => {
    savePrefs({ ...PREFS_DEFAULTS, 'gestures.swipeConfirmStyle': 'ghost' })
    expect(loadPrefs()['gestures.swipeConfirmStyle']).toBe('ghost')
  })
  it('a blue synced from the sheet stamped before the lock becomes wash; a later blue stays', () => {
    expect(migrateRemoteSwipeStyle('blue', '2026-10-30T00:00:00.000Z')).toBe('wash')
    expect(migrateRemoteSwipeStyle('blue', '2026-11-02T00:00:00.000Z')).toBe('blue')
    expect(migrateRemoteSwipeStyle('tint', '2026-10-30T00:00:00.000Z')).toBe('tint')
  })
})
