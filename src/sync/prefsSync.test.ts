import { describe, expect, it } from 'vitest'
import { CATEGORIES, defaultPrefSyncState, planPrefsSync, applyRemote, keyCategory, type PrefRow } from './prefsSync'

const T1 = '2026-10-29T18:00:00.000Z', T2 = '2026-10-29T19:00:00.000Z', T3 = '2026-10-29T20:00:00.000Z'
const vals = (o: Record<string, unknown> = {}) => ({
  palette: 'default', theme: 'night', 'theme.followSystem': false,
  'chrome.showFab': false, 'az.hideEmpty': false,
  'gestures.nameSwipeFrom': 0.5, 'gestures.swipeConfirmStyle': 'blue', 'gestures.swipeSingleRow': false,
  'share.templates': [], 'share.defaultId': 'pending', 'share.includeClassPrefix': false,
  'sync.yearStartMonth': 4, 'az.leftSide': false, 'az.showHud': true, 'sync.joinUrlOverride': false, ...o,
})

describe('v0.36.0 prefs sync core (t52u locks)', () => {
  it('six categories + Night/Day option; Academic year always on; Dev default off', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual(['appearance', 'mode', 'checklist', 'gestures', 'share', 'year', 'dev'])
    const s = defaultPrefSyncState('dev1')
    expect(s.enabled).toBe(true)
    expect(s.cats.dev).toBe(false)
    expect(CATEGORIES.find((c) => c.id === 'year')!.always).toBe(true)
    expect(keyCategory('theme')).toBe('mode')
  })
  it('never syncs token, URLs, haptics, reduce motion', () => {
    for (const k of ['bridgeToken', 'syncUrl', 'sheetUrl', 'haptics.level', 'haptics.enabled', 'chrome.reduceMotion']) expect(keyCategory(k)).toBeNull()
  })
  it('a change stamps the whole category; only enabled categories push', () => {
    const s = defaultPrefSyncState('dev1')
    s.snapshot = Object.fromEntries(Object.entries(vals()).map(([k, v]) => [k, JSON.stringify(v)]))
    const p = planPrefsSync(vals({ 'gestures.nameSwipeFrom': 0.3, 'az.showHud': false }), s, T1)
    const keys = p.push.map((r) => r.key).sort()
    expect(keys).toEqual(['gestures.nameSwipeFrom', 'gestures.swipeConfirmStyle', 'gestures.swipeSingleRow'])
    expect(p.push.every((r) => r.updatedAt === T1 && r.category === 'gestures')).toBe(true)
  })
  it('first sync with no stamps pushes nothing until a choice is made', () => {
    const p = planPrefsSync(vals(), defaultPrefSyncState('d'), T1)
    expect(p.push).toEqual([])
  })
  it('remote newer wins whole category; older ignored; disabled category ignored; year applies even when master on and cat flags off', () => {
    const s = defaultPrefSyncState('d'); s.cats.checklist = false
    s.stamps = { palette: T2 }
    const rows: PrefRow[] = [
      { key: 'palette', category: 'appearance', value: '3-sky', updatedAt: T1, deviceId: 'x' },
      { key: 'gestures.nameSwipeFrom', category: 'gestures', value: 0.3, updatedAt: T3, deviceId: 'x' },
      { key: 'chrome.showFab', category: 'checklist', value: true, updatedAt: T3, deviceId: 'x' },
      { key: 'sync.yearStartMonth', category: 'year', value: 6, updatedAt: T3, deviceId: 'x' },
    ]
    const r = applyRemote(rows, s, false)
    expect(r.apply).toEqual({ 'gestures.nameSwipeFrom': 0.3, 'sync.yearStartMonth': 6 })
    expect(r.state.stamps['gestures.nameSwipeFrom']).toBe(T3)
  })
  it('unknown keys from newer devices are kept, not applied', () => {
    const s = defaultPrefSyncState('d')
    const r = applyRemote([{ key: 'gestures.newThing', category: 'gestures', value: 1, updatedAt: T3, deviceId: 'x' }], s, false)
    expect(r.apply).toEqual({})
    expect(r.state.unknown['gestures.newThing']).toMatchObject({ value: 1 })
  })
  it('"Use synced settings" applies remote regardless of stamps; master off syncs nothing', () => {
    const s = defaultPrefSyncState('d'); s.stamps = { palette: T3 }
    expect(applyRemote([{ key: 'palette', category: 'appearance', value: '3-sky', updatedAt: T1, deviceId: 'x' }], s, true).apply).toEqual({ palette: '3-sky' })
    s.enabled = false
    expect(applyRemote([{ key: 'palette', category: 'appearance', value: '3-sky', updatedAt: T3, deviceId: 'x' }], s, false).apply).toEqual({})
    expect(planPrefsSync(vals({ palette: 'x' }), { ...s, snapshot: { palette: '"default"' } }, T1).push).toEqual([])
  })
})
