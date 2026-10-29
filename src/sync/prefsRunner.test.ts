import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettings, putSettings } from '../data/api'
import { resetDbForTests } from '../data/db'
import { loadPrefs, savePrefs } from '../prefs/appPrefs'
import { loadPrefSyncState, runPrefsSync } from './prefsRunner'

const mem = new Map<string, string>()
let sheet: any[] = []
let old = false
const posts: any[] = []
beforeEach(async () => {
  mem.clear(); sheet = []; old = false; posts.length = 0
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) }, removeItem: (k: string) => { mem.delete(k) }, clear: () => mem.clear() } })
  await resetDbForTests()
  await putSettings({ bridgeToken: 'TKN' })
  vi.stubGlobal('fetch', async (_u: string, init?: RequestInit) => {
    const b = JSON.parse(String(init?.body)); posts.push(b)
    if (old) return new Response(JSON.stringify({ ok: false, error: 'unknown action', version: '0.34.0' }))
    for (const r of b.rows ?? []) { const i = sheet.findIndex((x) => x.key === r.key); const n = { ...r, deviceId: b.deviceId }; if (i < 0) sheet.push(n); else if (r.updatedAt > sheet[i].updatedAt) sheet[i] = n }
    return new Response(JSON.stringify({ ok: true, prefs: sheet, version: '0.36.0' }))
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('prefs sync runner', () => {
  it('old bridge → "Update bridge script", nothing changes', async () => {
    old = true
    const r = await runPrefsSync('auto')
    expect(r.status).toBe('old')
    expect(r.message).toMatch(/Update bridge script/)
    expect(loadPrefSyncState().bridge).toBe('old')
  })
  it('first device seeds the sheet; never sends token/URLs/haptics', async () => {
    const r = await runPrefsSync('auto')
    expect(r.status).toBe('ok')
    expect(sheet.map((x) => x.key)).toContain('sync.yearStartMonth')
    expect(sheet.map((x) => x.key)).not.toContain('az.leftSide') // Dev off by default
    const all = JSON.stringify(posts)
    expect(all).not.toMatch(/bridgeToken"|syncUrl|sheetUrl|haptics|reduceMotion/)
  })
  it('second device: needs a choice when the sheet has settings; "synced" applies them', async () => {
    sheet = [{ key: 'palette', category: 'appearance', value: '3-sky', updatedAt: '2026-10-29T18:00:00.000Z', deviceId: 'A' },
      { key: 'sync.yearStartMonth', category: 'year', value: 6, updatedAt: '2026-10-29T18:00:00.000Z', deviceId: 'A' }]
    expect((await runPrefsSync('auto')).status).toBe('needs-choice')
    expect((await runPrefsSync('synced')).status).toBe('ok')
    expect((await getSettings()).palette).toBe('3-sky')
    expect(loadPrefs()['sync.yearStartMonth']).toBe(6)
  })
  it('"local" overwrites the sheet with this device; later local change pushes newer', async () => {
    sheet = [{ key: 'palette', category: 'appearance', value: '3-sky', updatedAt: '2026-10-29T18:00:00.000Z', deviceId: 'A' }]
    await putSettings({ palette: '8-black-and-pink' })
    await runPrefsSync('local')
    expect(sheet.find((x) => x.key === 'palette').value).toBe('8-black-and-pink')
    savePrefs({ ...loadPrefs(), 'gestures.nameSwipeFrom': 0.3 })
    await runPrefsSync('auto')
    expect(sheet.find((x) => x.key === 'gestures.nameSwipeFrom').value).toBe(0.3)
  })
  it('no token → off', async () => {
    await putSettings({ bridgeToken: '' })
    expect((await runPrefsSync('auto')).status).toBe('off')
  })
})
