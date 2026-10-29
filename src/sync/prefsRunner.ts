/**
 * v0.36.0 prefs sync IO: reads/writes localStorage prefs + IDB palette, talks to the bridge
 * (prefsPush returns the merged sheet rows). Device-only state lives in localStorage `sow-app.prefsync.v1`.
 */
import { getSettings, putSettings } from '../data/api'
import { loadPrefs, savePrefs, type AppPrefs } from '../prefs/appPrefs'
import { BridgeError, bridgeCall } from './bridge'
import { applyRemote, defaultPrefSyncState, planPrefsSync, stampAll, SYNC_KEYS, type PrefRow, type PrefSyncState } from './prefsSync'

const KEY = 'sow-app.prefsync.v1'
export const PREFS_APPLIED_EVENT = 'sow:prefs-applied'
export const UPDATE_BRIDGE_MSG = 'Update bridge script · re-paste Code.js and deploy a New version'

const rid = () => Math.random().toString(36).slice(2, 10)
export function loadPrefSyncState(): PrefSyncState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) { const d = defaultPrefSyncState(''); const p = JSON.parse(raw); return { ...d, ...p, cats: { ...d.cats, ...p.cats } } }
  } catch { /* fall through */ }
  const s = defaultPrefSyncState('d-' + rid())
  savePrefSyncState(s)
  return s
}
export function savePrefSyncState(s: PrefSyncState): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PREFSYNC_STATE_EVENT))
}
export const PREFSYNC_STATE_EVENT = 'sow:prefsync-state'

async function readValues(): Promise<Record<string, unknown>> {
  const p = loadPrefs() as unknown as Record<string, unknown>
  const s = await getSettings()
  const v: Record<string, unknown> = {}
  for (const k of SYNC_KEYS) v[k] = k === 'palette' ? (s.palette ?? 'default') : p[k]
  return v
}
async function writeValues(apply: Record<string, unknown>): Promise<void> {
  const keys = Object.keys(apply)
  if (!keys.length) return
  const { palette, ...rest } = apply
  if (Object.keys(rest).length) savePrefs({ ...loadPrefs(), ...(rest as Partial<AppPrefs>) })
  if (palette !== undefined) await putSettings({ palette: String(palette) })
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PREFS_APPLIED_EVENT))
}
const snap = (v: Record<string, unknown>) => Object.fromEntries(SYNC_KEYS.map((k) => [k, JSON.stringify(v[k])]))

export type PrefsSyncResult = { status: 'ok' | 'off' | 'old' | 'needs-choice' | 'error'; message: string; applied?: number }

/** mode: 'auto' (normal), 'synced' (first join: take the sheet's), 'local' (first join: this device wins). */
export async function runPrefsSync(mode: 'auto' | 'synced' | 'local' = 'auto'): Promise<PrefsSyncResult> {
  let st = loadPrefSyncState()
  if (!st.enabled && mode === 'auto') return { status: 'off', message: 'Settings sync is off' }
  const settings = await getSettings()
  const url = settings.syncUrl.trim(), token = settings.bridgeToken?.trim()
  if (!url || !token) return { status: 'off', message: 'Pair this device first' }
  if (mode !== 'auto') st = { ...st, enabled: true }
  const now = new Date().toISOString()
  const values = await readValues()
  if (mode === 'local') st = stampAll(values, st, now)
  const plan = planPrefsSync(values, st, now)
  st = plan.state
  const call = (rows: PrefRow[]) => bridgeCall<{ prefs: PrefRow[] }>(url, { token, action: 'prefsPush', deviceId: st.deviceId, rows })
  let res: { prefs: PrefRow[] }
  try {
    res = await call(plan.push)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (e instanceof BridgeError && /unknown action/i.test(msg)) {
      savePrefSyncState({ ...st, bridge: 'old', lastError: UPDATE_BRIDGE_MSG })
      return { status: 'old', message: UPDATE_BRIDGE_MSG }
    }
    savePrefSyncState({ ...st, lastError: msg })
    return { status: 'error', message: msg }
  }
  const rows = Array.isArray(res.prefs) ? res.prefs : []
  if (!st.chosen && mode === 'auto') {
    if (rows.some((r) => SYNC_KEYS.includes(r.key))) {
      savePrefSyncState({ ...st, bridge: 'ok' })
      return { status: 'needs-choice', message: 'Choose which settings to use' }
    }
    // First device: seed the sheet with this device's settings.
    st = stampAll(values, st, now)
    try { res = await call(planPrefsSync(values, st, now).push) } catch (e) { return { status: 'error', message: e instanceof Error ? e.message : String(e) } }
  }
  const r = applyRemote(Array.isArray(res.prefs) ? res.prefs : rows, st, mode === 'synced')
  await writeValues(r.apply)
  const after = { ...values, ...r.apply }
  st = { ...r.state, snapshot: snap(after), lastSyncAt: now, lastError: undefined, bridge: 'ok', chosen: true }
  savePrefSyncState(st)
  const n = Object.keys(r.apply).length
  return { status: 'ok', message: n ? `Settings synced · ${n} updated` : 'Settings synced', applied: n }
}
