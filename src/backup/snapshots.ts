/**
 * v0.45.0 (LOCKED t62s226): on-device snapshots of every tick.
 * Auto after each change batch · on app open · before every sync / update · manual "Back up now".
 * Keeps the last 50 + the newest per day for 30 days. Stored in the data source's own IndexedDB,
 * so Stable and Beta never share snapshots.
 * Restore saves the current state as "Before restore" first, then rewrites every tick that differs
 * with a timestamp newer than anything on the phone, so the next push wins on the sheet too and
 * cleared ticks don't come back on pull (newer timestamp wins on the bridge).
 */
import { getDb } from '../data/db'
import { putMark } from '../data/api'
import type { ClassKey, Mark } from '../data/types'

export type SnapKind = 'auto' | 'manual' | 'before-restore'
export type SnapTick = { c: ClassKey; r: number; d: string; n: string; t: string; s: boolean; sub: boolean }
export type SnapMeta = { id: string; at: string; kind: SnapKind; reason: string; ticks: number; dates: number; classes: number; hash: string }
export type SnapshotRow = SnapMeta & { marks: SnapTick[] }

const KEEP_LAST = 50
const DAYS = 30
const DAY = 86400000

/** Pure: which snapshot ids to drop. Manual and Before-restore snapshots inside 30 days are always kept. */
export function pruneIds(list: Pick<SnapMeta, 'id' | 'at' | 'kind'>[], now = Date.now()): string[] {
  const sorted = [...list].sort((a, b) => b.at.localeCompare(a.at))
  const keep = new Set(sorted.slice(0, KEEP_LAST).map((x) => x.id))
  const seenDay = new Set<string>()
  for (const s of sorted) {
    const t = Date.parse(s.at)
    if (now - t > DAYS * DAY) continue
    if (s.kind === 'manual' || s.kind === 'before-restore') keep.add(s.id)
    const day = new Date(t + 330 * 60000).toISOString().slice(0, 10) // IST day
    if (!seenDay.has(day)) { seenDay.add(day); keep.add(s.id) }
  }
  return sorted.filter((s) => !keep.has(s.id)).map((s) => s.id)
}

function hashTicks(ticks: SnapTick[]): string {
  const s = ticks.map((x) => `${x.c}|${x.r}|${x.d}|${x.s ? 1 : 0}${x.sub ? 1 : 0}`).sort().join(',')
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `${ticks.length}:${(h >>> 0).toString(36)}`
}

const tickOf = (m: Mark): SnapTick => ({ c: m.classKey, r: m.roll, d: m.date, n: m.name, t: m.topic, s: m.set, sub: m.submitted })
const keyOf = (c: string, r: number, d: string) => `${c}|${r}|${d}`

async function currentTicks(): Promise<{ all: Mark[]; ticks: SnapTick[] }> {
  const all = await (await getDb()).getAll('marks')
  return { all, ticks: all.filter((m) => m.set || m.submitted).map(tickOf) }
}

export async function listSnapshots(): Promise<SnapMeta[]> {
  const rows = await (await getDb()).getAll('snapshots')
  return rows.map(({ marks: _m, ...meta }) => meta).sort((a, b) => b.at.localeCompare(a.at))
}

let lastAt = ''
function stamp(): string {
  let t = new Date().toISOString()
  if (t <= lastAt) t = new Date(Date.parse(lastAt) + 1).toISOString()
  lastAt = t
  return t
}

/** Take a snapshot. An auto snapshot identical to the latest one is skipped (returns null). */
export async function takeSnapshot(kind: SnapKind, reason: string): Promise<SnapMeta | null> {
  const db = await getDb()
  const { ticks } = await currentTicks()
  const hash = hashTicks(ticks)
  const list = await listSnapshots()
  if (kind === 'auto' && list[0]?.hash === hash) return null
  const at = stamp()
  const meta: SnapMeta = {
    id: `snap-${at}`,
    at,
    kind,
    reason,
    ticks: ticks.filter((x) => x.s).length,
    dates: new Set(ticks.map((x) => `${x.c}|${x.d}`)).size,
    classes: new Set(ticks.map((x) => x.c)).size,
    hash,
  }
  await db.put('snapshots', { ...meta, marks: ticks })
  for (const id of pruneIds([...list, meta])) await db.delete('snapshots', id)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('sow:snapshots'))
  return meta
}

export async function snapshotTicksNow(): Promise<number> {
  return (await currentTicks()).ticks.filter((x) => x.s).length
}

/** How many ticks a restore would change (shown in the amber confirm). */
export async function diffCount(id: string): Promise<number> {
  const snap = await (await getDb()).get('snapshots', id)
  if (!snap) return 0
  const { all } = await currentTicks()
  const want = new Map(snap.marks.map((x) => [keyOf(x.c, x.r, x.d), x.s]))
  let n = 0
  const seen = new Set<string>()
  for (const m of all) { const k = keyOf(m.classKey, m.roll, m.date); seen.add(k); if (m.set !== (want.get(k) ?? false)) n++ }
  for (const [k, v] of want) if (!seen.has(k) && v) n++
  return n
}

export type RestoreResult = { undone: number; ticks: number; beforeId: string; at: string }

export async function restoreSnapshot(id: string): Promise<RestoreResult> {
  const db = await getDb()
  const snap = await db.get('snapshots', id)
  if (!snap) throw new Error('Snapshot not found')
  const before = (await takeSnapshot('before-restore', 'Before restore'))!
  const { all } = await currentTicks()
  const want = new Map(snap.marks.map((x) => [keyOf(x.c, x.r, x.d), x]))
  let maxTs = Date.now()
  for (const m of all) maxTs = Math.max(maxTs, Date.parse(m.updatedAt) || 0)
  const ts = new Date(maxTs + 1).toISOString()
  let undone = 0
  const seen = new Set<string>()
  for (const m of all) {
    const k = keyOf(m.classKey, m.roll, m.date)
    seen.add(k)
    const w = want.get(k)
    const set = w?.s ?? false
    const submitted = w?.sub ?? false
    if (m.set === set && m.submitted === submitted) continue
    if (m.set !== set) undone++
    await putMark({ ...m, set, submitted, updatedAt: ts })
  }
  for (const [k, w] of want) {
    if (seen.has(k)) continue
    if (w.s) undone++
    await putMark({ classKey: w.c, roll: w.r, name: w.n, date: w.d, topic: w.t, set: w.s, submitted: w.sub, updatedAt: ts })
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('sow:snapshots'))
  return { undone, ticks: snap.ticks, beforeId: before.id, at: snap.at }
}

/** v0.46.0 (t7u): "before update" snapshot that is confirmed: written, then read back from IDB and compared by hash. */
export async function snapshotBeforeUpdate(): Promise<boolean> {
  await takeSnapshot('auto', 'before update')
  const want = hashTicks((await currentTicks()).ticks)
  const db = await getDb()
  const newest = (await listSnapshots())[0]
  if (!newest || newest.hash !== want) return false
  return !!(await db.get('snapshots', newest.id))
}
