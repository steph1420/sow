/**
 * Sync engine — Quiet path.
 * Pull: selected subject tabs via gviz when sheet URL is set + readable.
 * Push: requires Apps Script syncUrl — otherwise honest “not connected”.
 * Sync now: pull selected · push iff bridge + dirty · else Quiet local save.
 */
import {
  CLASS_KEYS,
  type SubjectId,
  deleteMark,
  getMark,
  getSession,
  getSettings,
  listMarks,
  putMark,
  putSession,
  putSettings,
  putStudent,
} from '../data'
import { CLASS_LABELS, type ClassKey, type DiscoveredTab, type Settings } from '../data/types'
import { getDb } from '../data/db'
import { clearUndoStacks } from '../lib/undoStack'
import { parseCsv } from './csv'
import { OfflineError, discoverTabs, fetchSheetCsv, type Discovery } from './gviz'
import { parseEngTabLite, sheetDateToIsoAcademic } from './parseEngLite'
import { loadPrefs } from '../prefs/appPrefs'
import { extractSheetId } from './sheetId'

export type SyncReport = {
  ok: boolean
  message: string
  mode: 'local-only' | 'pull' | 'push' | 'probe' | 'sync'
  pulledStudents: number
  pulledMarks: number
  pushed: boolean
}

function hashRows(rows: string[][]): string {
  let h = 5381
  const s = rows.map((r) => r.join('\u0001')).join('\u0002')
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

const emptyReport = (mode: SyncReport['mode'], message: string, ok = false): SyncReport => ({
  ok,
  message,
  mode,
  pulledStudents: 0,
  pulledMarks: 0,
  pushed: false,
})

export const OFFLINE_MESSAGE = 'You’re offline · last sheet tabs kept · marks stay on this device. Sync when back online.'

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/** Discover real tabs and cache them in settings (chips + Subjects read this). */
export async function discoverAndStore(): Promise<{
  tabs: DiscoveredTab[]
  discovery?: Discovery
  error?: string
  offline?: boolean
}> {
  const settings = await getSettings()
  const id = extractSheetId(settings.sheetUrl)
  if (!id) return { tabs: [], error: 'No Sheet URL in settings · local IDB only.' }
  const prev = settings.discoveredTabs ?? []
  // P1-2: offline / network failure never wipes the last discovered tabs.
  if (isOffline()) return { tabs: prev, error: OFFLINE_MESSAGE, offline: true }
  try {
    const d = await discoverTabs(id)
    // v0.29.1 Q-FIX-5: a tab that failed to load is uncertain → keep it from the last discovery.
    const kept = prev.filter((t) => d.errored.includes(t.name) && !d.tabs.some((x) => x.name === t.name))
    const tabs = [...d.tabs, ...kept]
    await putSettings({ discoveredTabs: tabs, discoveredAt: new Date().toISOString() })
    return { tabs, discovery: { ...d, tabs } }
  } catch (e) {
    if (e instanceof OfflineError) return { tabs: prev, error: OFFLINE_MESSAGE, offline: true }
    return { tabs: prev, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function probeSheet(): Promise<SyncReport> {
  const r = await discoverAndStore()
  if (r.offline) return emptyReport('probe', r.error!)
  if (r.error && !r.discovery) {
    await putSettings({ lastSyncError: r.error })
    return emptyReport('probe', r.error)
  }
  const d = r.discovery!
  const ok = d.tabs.length > 0
  const message = ok
    ? `Workbook reachable · ${d.tabs.map((t) => t.name).join(' · ')}${d.rejected.length ? ` · not on sheet: ${d.rejected.join(', ')}` : ''}`
    : 'Opened workbook but found no readable teaching tabs.'
  await putSettings({ lastSyncError: ok ? undefined : message })
  return emptyReport('probe', message, ok)
}

export type TabPullStat = { tab: string; students: number; marks: number; kept: number; warnings: string[] }

/**
 * t158u — drop demo classes (e.g. Math/Sci) that aren't tabs on the sheet.
 * v0.29.1 Q-FIX-5 (t3u): a class that was ever pulled from the sheet is purged only when the
 * sheet itself confirms its tab is gone, never on a fetch failure; its Submitted ticks
 * (app-only, not on the sheet) are always preserved.
 */
export async function purgeClassesNotOnSheet(
  onSheet: DiscoveredTab[],
  confirm?: { confirmedMissing: string[]; pulled: Set<ClassKey> },
): Promise<number> {
  const keep = new Set(onSheet.map((t) => t.classKey))
  if (!keep.size) return 0
  const db = await getDb()
  let n = 0
  for (const k of CLASS_KEYS) {
    if (keep.has(k)) continue
    const pulled = confirm ? confirm.pulled.has(k) : false
    if (pulled && !confirm!.confirmedMissing.includes(CLASS_LABELS[k])) continue // uncertain → keep
    for (const store of ['students', 'rosterMeta', 'sessions', 'marks'] as const) {
      const keys = await db.getAllKeysFromIndex(store, 'by-class', k)
      for (const key of keys) {
        if (pulled && store === 'marks') {
          const m = await db.get('marks', key)
          if (m?.submitted) continue // Submitted ticks preserved
        }
        await db.delete(store, key)
        n++
      }
    }
  }
  return n
}

/**
 * v0.29.2 one-time migration (Q-FIX-2 A): v0.29.1 stamped every tick of a class on each save, so
 * per-tick history can't be recovered. Ticks untouched since the last pull get a baseline
 * (sheetSet = set, they equalled the sheet then); ticks stamped after it stay baseline-less and keep
 * the old local-wins rule for one more pull — never dropping a local edit.
 */
export async function migrateMergeV2(engSyncState: Settings['engSyncState'] = {}): Promise<number> {
  let n = 0
  for (const [key, st] of Object.entries(engSyncState ?? {})) {
    if (!st) continue
    for (const m of await listMarks(key as ClassKey)) {
      if (m.sheetSet !== undefined || m.updatedAt > st.lastSyncAt) continue
      await putMark({ ...m, sheetSet: m.set }, { fromSheet: true })
      n++
    }
  }
  await putSettings({ mergeV2At: new Date().toISOString() })
  return n
}

/** Merge-pull discovered tabs. Never imports a tab that discovery rejected. */
async function pullTabs(tabs: DiscoveredTab[], discovery?: Discovery): Promise<SyncReport & { perTab: TabPullStat[] }> {
  const settings = await getSettings()
  const id = extractSheetId(settings.sheetUrl)
  if (!id) {
    return {
      ...emptyReport('pull', 'Not connected · set a Google Sheet URL to pull subject tabs. Local marks stay in IDB.'),
      perTab: [],
    }
  }
  if (!tabs.length) {
    return { ...emptyReport('pull', 'No readable tabs for the selected subjects · marks stay on this device.'), perTab: [] }
  }

  const now = new Date().toISOString()
  let pulledStudents = 0
  let pulledMarks = 0
  const errors: string[] = []
  const perTab: TabPullStat[] = []
  const engSyncState = { ...(settings.engSyncState ?? {}) }
  const notes: string[] = []
  const yearStartMonth = loadPrefs()['sync.yearStartMonth'] ?? 4
  if (!settings.mergeV2At) await migrateMergeV2(engSyncState)

  for (const tab of tabs) {
    const key = tab.classKey
    try {
      const cached = discovery?.csv.get(tab.name)
      const rows = cached != null ? parseCsv(cached) : await fetchSheetCsv(id, tab.name)
      const parsed = parseEngTabLite(key, rows, now, { yearStartMonth })
      const prev = engSyncState[key]
      const stat: TabPullStat = { tab: tab.name, students: 0, marks: 0, kept: 0, warnings: parsed.warnings }

      for (const s of parsed.students) {
        await putStudent(s)
        stat.students++
      }

      // P0-1: first pull for this key → sheet wins entirely. Every pre-existing mark
      // (demo seed, incl. app-only Submitted) is dropped; later pulls keep Submitted.
      if (!prev) {
        for (const old of await listMarks(key)) await deleteMark(old.markId, { fromSheet: true })
      }

      for (const m of parsed.marks) {
        const existing = await getMark(key, m.roll, m.date)
        // v0.29.2 Q-FIX-2 A — per tick: a tick changed on this device since the last pull (differs from
        // its sheet baseline) beats an unchanged sheet value; otherwise the sheet's value wins.
        // Legacy ticks without a baseline fall back to the old timestamp rule (no data loss).
        // Submitted is app-only → always kept.
        const localChanged =
          !!existing &&
          (existing.sheetSet === undefined ? existing.updatedAt > (prev?.lastSyncAt ?? "") : existing.set !== existing.sheetSet)
        const localNewer = !!prev && localChanged && existing!.set !== m.set
        if (localNewer) stat.kept++
        await putMark({
          ...m,
          set: localNewer ? existing!.set : m.set,
          submitted: prev ? (existing?.submitted ?? false) : false,
          updatedAt: localNewer ? existing!.updatedAt : now,
          sheetSet: m.set,
        }, { fromSheet: true })
        stat.marks++
      }

      if (parsed.current.date1) {
        const prevSession = await getSession(`${key}|current`)
        await putSession({
          sessionId: `${key}|current`,
          classKey: key,
          date1: sheetDateToIsoAcademic(parsed.current.date1, now, yearStartMonth),
          topic1: parsed.current.topic1,
          date2: parsed.current.date2 ? sheetDateToIsoAcademic(parsed.current.date2, now, yearStartMonth) : '',
          topic2: parsed.current.topic2,
          createdAt: prevSession?.createdAt ?? now,
          updatedAt: now,
        }, { fromSheet: true })
      }

      engSyncState[key] = { hash: hashRows(rows), sheetSeenAt: now, lastSyncAt: now }
      pulledStudents += stat.students
      pulledMarks += stat.marks
      perTab.push(stat)
      for (const w of parsed.warnings) errors.push(`${tab.name}: ${w}`)
      for (const n of parsed.notes) notes.push(`${tab.name}: ${n}`)
    } catch (e) {
      errors.push(`${tab.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const ok = pulledStudents > 0 || pulledMarks > 0
  const message = ok
    ? `Pulled ${pulledStudents} students · ${pulledMarks} marks (${perTab.map((t) => `${t.tab} ${t.marks}`).join(' · ')})${errors.length ? ` · ${errors.length} tab warning(s)` : ''}`
    : errors[0] ?? 'Pull returned nothing · sheet may be private or tabs renamed.'

  if (ok && discovery) {
    const pulled = new Set(Object.keys(settings.engSyncState ?? {}) as ClassKey[])
    await purgeClassesNotOnSheet(discovery.tabs, { confirmedMissing: discovery.confirmedMissing, pulled })
  }
  if (ok) clearUndoStacks() // v0.29.1: undo must never restore pre-pull marks over sheet data

  await putSettings({
    engSyncState,
    lastSyncAt: ok ? now : settings.lastSyncAt,
    lastSyncError: ok ? (errors.length ? errors.join('; ') : undefined) : message,
    ...(ok ? { syncNotes: notes } : {}),
  })

  return { ok, message, mode: 'pull', pulledStudents, pulledMarks, pushed: false, perTab }
}

/** Pull every discovered Eng tab. */
export async function pullEng(): Promise<SyncReport> {
  return pullSubjects(['Eng'])
}

/** Pull discovered tabs for the selected this-run subjects (fresh discovery every run). */
export async function pullSubjects(subjects: SubjectId[]): Promise<SyncReport & { perTab?: TabPullStat[] }> {
  const r = await discoverAndStore()
  if (r.error && !r.discovery) return emptyReport('pull', r.error)
  const tabs = r.tabs.filter((t) => subjects.includes(t.subject))
  const missing = subjects.filter((s) => !r.tabs.some((t) => t.subject === s))
  if (!tabs.length) {
    return emptyReport(
      'pull',
      missing.length
        ? `${missing.join(' · ')} not on sheet yet · marks stay on this device.`
        : 'Select at least one subject tab.',
    )
  }
  const report = await pullTabs(tabs, r.discovery)
  if (missing.length && report.ok) {
    return { ...report, message: `${report.message} · ${missing.join(' · ')} skipped (no tabs yet)` }
  }
  return report
}

/** v0.29.2 Q-FIX-7 (t3u "Think the best concise way"): honest status until a real push exists. */
export const PUSH_NOT_SET_UP = 'Saved on this device · push not set up'

/**
 * Push is not built yet (Q-FIX-9 C: Apps Script stays undeployed; a token-auth push comes later).
 * The old placeholder POST could answer ok and claim "Pushed" with nothing sent — so never call it.
 * syncDirty is left as is: only a real successful push may clear it.
 */
export async function pushLocal(): Promise<SyncReport> {
  return { ...emptyReport('push', PUSH_NOT_SET_UP), pushed: false }
}

/**
 * Sync now — pull the selected subjects; marks always stay on this device. Never reports "Pushed"
 * unless a real push succeeded (none exists yet).
 */
export async function syncNow(subjects: SubjectId[]): Promise<SyncReport> {
  if (isOffline()) return emptyReport('sync', OFFLINE_MESSAGE)
  const settings = await getSettings()
  const pull = await pullSubjects(subjects)
  if (pull.message === OFFLINE_MESSAGE) return { ...pull, mode: 'sync' } // P1-2: no push, no state change
  const push = await pushLocal()
  return {
    ok: pull.ok || !extractSheetId(settings.sheetUrl), // local-only still ok
    message: pull.ok || !pull.message.includes('Not connected') ? `${pull.message} · ${push.message}` : push.message,
    mode: pull.ok ? 'sync' : settings.sheetUrl ? 'sync' : 'local-only',
    pulledStudents: pull.pulledStudents,
    pulledMarks: pull.pulledMarks,
    pushed: false,
  }
}

/** Re-export for callers that still map all keys. */
export { CLASS_KEYS }
