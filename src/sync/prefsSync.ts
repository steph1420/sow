/**
 * v0.36.0 prefs sync across paired devices (Steve t52u; docs/PREFS_SYNC_PLAN.md).
 * Pure core: categories, whole-category stamping on change, newer-wins apply, unknown keys kept.
 * Rows on the sheet are per key (key, category, value, updatedAt, deviceId) in the hidden Prefs tab.
 * Never synced: bridge token, sync/sheet URLs, haptics, reduce motion (not in any category).
 */
export type CatId = 'appearance' | 'mode' | 'checklist' | 'gestures' | 'share' | 'year' | 'dev'
export type Category = { id: CatId; label: string; sub: string; keys: string[]; always?: boolean; defaultOn: boolean }

export const CATEGORIES: Category[] = [
  { id: 'appearance', label: 'Appearance', sub: 'Colour theme · Follow system', keys: ['palette', 'theme.followSystem'], defaultOn: true },
  { id: 'mode', label: 'Night / Day', sub: 'Same mode on every device', keys: ['theme'], defaultOn: true },
  { id: 'checklist', label: 'Checklist feel', sub: 'Sort button · A–Z hide dimmed', keys: ['chrome.showFab', 'az.hideEmpty'], defaultOn: true },
  { id: 'gestures', label: 'Gestures', sub: 'Swipe from name · confirm style · one row only', keys: ['gestures.nameSwipeFrom', 'gestures.swipeConfirmStyle', 'gestures.swipeSingleRow'], defaultOn: true },
  { id: 'share', label: 'Share templates', sub: 'Message templates · default · class prefix', keys: ['share.templates', 'share.defaultId', 'share.includeClassPrefix'], defaultOn: true },
  { id: 'year', label: 'Academic year', sub: 'Always synced', keys: ['sync.yearStartMonth'], always: true, defaultOn: true },
  { id: 'dev', label: 'Developer options', sub: 'A–Z side + HUD · bridge override · keyboard advance', keys: ['az.leftSide', 'az.showHud', 'sync.joinUrlOverride', 'kbd.autoAdvance'], defaultOn: false },
]
const KEY_CAT: Record<string, CatId> = Object.fromEntries(CATEGORIES.flatMap((c) => c.keys.map((k) => [k, c.id])))
export const SYNC_KEYS = Object.keys(KEY_CAT)
export function keyCategory(key: string): CatId | null { return KEY_CAT[key] ?? null }

export type PrefRow = { key: string; category: string; value: unknown; updatedAt: string; deviceId?: string }
export type PrefSyncState = {
  enabled: boolean
  cats: Record<CatId, boolean>
  deviceId: string
  /** updatedAt per key (whole category gets the same stamp on a local change). */
  stamps: Record<string, string>
  /** JSON of each key's value at the last sync — detects local changes. */
  snapshot: Record<string, string>
  /** Keys this app version doesn't know yet — kept, never applied. */
  unknown: Record<string, PrefRow>
  lastSyncAt?: string
  lastError?: string
  /** 'old' = bridge has no prefs actions yet. */
  bridge?: 'ok' | 'old'
  /** First-join choice already made on this device. */
  chosen?: boolean
}

export function defaultPrefSyncState(deviceId: string): PrefSyncState {
  return {
    enabled: true,
    cats: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.defaultOn])) as Record<CatId, boolean>,
    deviceId, stamps: {}, snapshot: {}, unknown: {},
  }
}
export function catOn(s: PrefSyncState, id: CatId): boolean {
  if (!s.enabled) return false
  const c = CATEGORIES.find((x) => x.id === id)!
  return c.always ? true : !!s.cats[id]
}

/** Stamp changed categories (whole category) and list rows to push. */
export function planPrefsSync(values: Record<string, unknown>, s: PrefSyncState, now: string): { push: PrefRow[]; state: PrefSyncState } {
  const st: PrefSyncState = { ...s, stamps: { ...s.stamps } }
  if (!s.enabled) return { push: [], state: st }
  const push: PrefRow[] = []
  for (const c of CATEGORIES) {
    if (!catOn(s, c.id)) continue
    const changed = c.keys.some((k) => k in s.snapshot && s.snapshot[k] !== JSON.stringify(values[k]))
    if (changed) {
      // Must beat the previous stamp even when two syncs share a millisecond.
      const prev = c.keys.map((k) => st.stamps[k] ?? '').sort().pop() ?? ''
      const stamp = now > prev ? now : new Date(Date.parse(prev) + 1).toISOString()
      for (const k of c.keys) st.stamps[k] = stamp
    }
    for (const k of c.keys) if (st.stamps[k] && k in values) push.push({ key: k, category: c.id, value: values[k], updatedAt: st.stamps[k] })
  }
  return { push, state: st }
}

/** Stamp every enabled key now ("Use this device's settings"). */
export function stampAll(values: Record<string, unknown>, s: PrefSyncState, now: string): PrefSyncState {
  const st = { ...s, stamps: { ...s.stamps } }
  for (const c of CATEGORIES) if (catOn(s, c.id)) for (const k of c.keys) if (k in values) st.stamps[k] = now
  return st
}

/** Newer remote rows win; `force` = "Use synced settings" (take remote regardless of stamps). */
export function applyRemote(rows: PrefRow[], s: PrefSyncState, force: boolean): { apply: Record<string, unknown>; state: PrefSyncState } {
  const st: PrefSyncState = { ...s, stamps: { ...s.stamps }, unknown: { ...s.unknown } }
  const apply: Record<string, unknown> = {}
  for (const r of rows) {
    const cat = keyCategory(r.key)
    if (!cat) { if (r.category && !/token|url/i.test(r.key)) st.unknown[r.key] = r; continue }
    delete st.unknown[r.key]
    if (!catOn(s, cat)) continue
    if (force || !st.stamps[r.key] || r.updatedAt > st.stamps[r.key]) {
      apply[r.key] = r.value
      st.stamps[r.key] = r.updatedAt
    }
  }
  return { apply, state: st }
}
