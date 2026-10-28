import { beforeEach, describe, expect, it } from 'vitest'
import { loadPrefs, PREFS_DEFAULTS, savePrefs } from './appPrefs'

const mem = new Map<string, string>()
beforeEach(() => {
  mem.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v)
      },
      clear: () => mem.clear(),
      removeItem: (k: string) => {
        mem.delete(k)
      },
    },
  })
})

describe('appPrefs', () => {
  it('defaults: FAB off, hideEmpty off, night', () => {
    const p = loadPrefs()
    expect(p['chrome.showFab']).toBe(false)
    expect(p['az.hideEmpty']).toBe(false)
    expect(p.theme).toBe('night')
    expect(p).toEqual(PREFS_DEFAULTS)
  })

  it('round-trips theme + FAB', () => {
    savePrefs({ ...PREFS_DEFAULTS, theme: 'day', 'chrome.showFab': true })
    const p = loadPrefs()
    expect(p.theme).toBe('day')
    expect(p['chrome.showFab']).toBe(true)
  })
})
