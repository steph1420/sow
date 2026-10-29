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
  it('defaults: FAB off, hideEmpty off, night, reduceMotion off', () => {
    const p = loadPrefs()
    expect(p['chrome.showFab']).toBe(false)
    expect(p['az.hideEmpty']).toBe(false)
    expect(p['chrome.reduceMotion']).toBe(false)
    expect(p['theme.followSystem']).toBe(false)
    expect(p.theme).toBe('night')
    expect(p).toEqual(PREFS_DEFAULTS)
  })

  it('round-trips theme + FAB', () => {
    savePrefs({ ...PREFS_DEFAULTS, theme: 'day', 'chrome.showFab': true })
    const p = loadPrefs()
    expect(p.theme).toBe('day')
    expect(p['chrome.showFab']).toBe(true)
  })

  it('v0.28 share: fresh install seeds 4 templates, Pending default', () => {
    const p = loadPrefs()
    expect(p['share.templates'].map((t) => t.name)).toEqual(['Pending', 'Completed', 'Submitted', 'Not submitted'])
    expect(p['share.defaultId']).toBe('pending')
    expect(p['share.includeClassPrefix']).toBe(false)
  })

  it('v0.28 share: legacy sow.prefs.v1 share.template migrates once into Pending, key dropped', () => {
    mem.set('sow.prefs.v1', JSON.stringify({ 'share.template': 'Hi {class}\n{names}', 'share.includeClassPrefix': true, theme: 'x' }))
    // existing v0.27 app prefs without share keys
    mem.set('sow-app.prefs.v1', JSON.stringify({ theme: 'day' }))
    const p = loadPrefs()
    expect(p.theme).toBe('day')
    expect(p['share.templates'][0]!.body).toBe('Hi {class}\n{names}')
    expect(p['share.includeClassPrefix']).toBe(true)
    const legacy = JSON.parse(mem.get('sow.prefs.v1')!)
    expect('share.template' in legacy).toBe(false)
    expect(legacy.theme).toBe('x')
    // later edits are never clobbered by a re-migration
    savePrefs({ ...p, 'share.templates': [{ id: 'pending', name: 'Pending', body: 'edited' }] })
    mem.set('sow.prefs.v1', JSON.stringify({ 'share.template': 'again' }))
    expect(loadPrefs()['share.templates'][0]!.body).toBe('edited')
  })
})
