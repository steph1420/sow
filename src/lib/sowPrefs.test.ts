import { describe, expect, it, beforeEach } from 'vitest'
import {
  PREFS_DEFAULTS,
  exportPrefsText,
  importPrefsText,
  loadPrefs,
  parsePrefsExport,
  savePrefs,
} from './sowPrefs'

class MemoryStorage {
  private data = new Map<string, string>()
  clear() { this.data.clear() }
  getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null }
  setItem(k: string, v: string) { this.data.set(k, String(v)) }
  removeItem(k: string) { this.data.delete(k) }
}

const mem = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { value: mem, configurable: true })
// CustomEvent for savePrefs
if (typeof globalThis.CustomEvent === 'undefined') {
  // @ts-expect-error test shim
  globalThis.CustomEvent = class CustomEvent extends Event {
    detail: unknown
    constructor(type: string, init?: { detail?: unknown }) {
      super(type)
      this.detail = init?.detail
    }
  }
}

describe('sowPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads defaults', () => {
    expect(loadPrefs()['overview.filterStyle']).toBe('shade')
    expect(loadPrefs()['undo.chrome']).toBe('icons')
  })

  it('saves and exports', () => {
    savePrefs({ 'overview.filterStyle': 'underline', 'az.fe.count': 3 })
    const text = exportPrefsText()
    expect(text.startsWith('sow.prefs.v1\n')).toBe(true)
    expect(text).toContain('overview.filterStyle=underline')
    expect(text).toContain('az.fe.count=3')
  })

  it('imports export block', () => {
    const block = `sow.prefs.v1
overview.filterStyle=boldColor
undo.chrome=iconsLabel
appearance.nightBold=true
az.mode=single
`
    const parsed = parsePrefsExport(block)
    expect(parsed?.['overview.filterStyle']).toBe('boldColor')
    const next = importPrefsText(block)
    expect(next?.['undo.chrome']).toBe('iconsLabel')
    expect(next?.['appearance.nightBold']).toBe(true)
    expect(next?.['az.mode']).toBe('single')
    expect(loadPrefs()['overview.filterStyle']).toBe('boldColor')
  })

  it('rejects bad header', () => {
    expect(parsePrefsExport('nope\naz.mode=single')).toBeNull()
  })

  it('defaults object is complete', () => {
    expect(Object.keys(PREFS_DEFAULTS).length).toBeGreaterThan(15)
  })

  it('defaults idleWidth 42, hideEmpty off, showFab false, useRebuild false', () => {
    expect(PREFS_DEFAULTS['az.idleWidth']).toBe(42)
    expect(PREFS_DEFAULTS['az.hideEmpty']).toBe(false)
    expect(PREFS_DEFAULTS['chrome.showFab']).toBe(false)
    expect(PREFS_DEFAULTS['chrome.useRebuild']).toBe(false)
    expect(loadPrefs()['az.idleWidth']).toBe(42)
    expect(loadPrefs()['chrome.showFab']).toBe(false)
    expect(loadPrefs()['chrome.useRebuild']).toBe(false)
  })

  it('migrates sticky idleWidth < 40 → 42 once (MJ-16) and hideEmpty off (MJ-15)', () => {
    localStorage.removeItem('sow.prefs.mj15.hideEmptyOff')
    localStorage.removeItem('sow.prefs.mj16.idleWidth42')
    localStorage.setItem(
      'sow.prefs.v1',
      JSON.stringify({ ...PREFS_DEFAULTS, 'az.idleWidth': 35, 'az.hideEmpty': true }),
    )
    const p = loadPrefs()
    expect(p['az.idleWidth']).toBe(42)
    expect(p['az.hideEmpty']).toBe(false)
    // one-shot done — user can re-enable hideEmpty / set width in Dev
    savePrefs({ 'az.hideEmpty': true, 'az.idleWidth': 35 })
    expect(loadPrefs()['az.hideEmpty']).toBe(true)
    expect(loadPrefs()['az.idleWidth']).toBe(35) // after one-shot, 35 stays (still ≥34)
  })

  it('always bumps pathological idleWidth < 34 → 42', () => {
    localStorage.setItem('sow.prefs.mj16.idleWidth42', '1')
    localStorage.setItem(
      'sow.prefs.v1',
      JSON.stringify({ ...PREFS_DEFAULTS, 'az.idleWidth': 22 }),
    )
    expect(loadPrefs()['az.idleWidth']).toBe(42)
  })

  it('clamps idleWidth up to 48', () => {
    savePrefs({ 'az.idleWidth': 48 })
    expect(loadPrefs()['az.idleWidth']).toBe(48)
    savePrefs({ 'az.idleWidth': 99 })
    expect(loadPrefs()['az.idleWidth']).toBe(48)
  })

  it('missing chrome.showFab coerces to false', () => {
    localStorage.setItem('sow.prefs.v1', JSON.stringify({ 'az.idleWidth': 42 }))
    localStorage.setItem('sow.prefs.mj15.hideEmptyOff', '1')
    localStorage.setItem('sow.prefs.mj16.idleWidth42', '1')
    expect(loadPrefs()['chrome.showFab']).toBe(false)
  })

  it('exports and imports chrome keys', () => {
    savePrefs({ 'chrome.showFab': true, 'chrome.useRebuild': true })
    const text = exportPrefsText()
    expect(text).toContain('chrome.showFab=true')
    expect(text).toContain('chrome.useRebuild=true')
    localStorage.clear()
    const next = importPrefsText(text)
    expect(next?.['chrome.showFab']).toBe(true)
    expect(next?.['chrome.useRebuild']).toBe(true)
  })
})
