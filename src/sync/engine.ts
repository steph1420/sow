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
import type { DiscoveredTab } from '../data/types'
import { bridgePush } from './bridge'
import { getDb } from '../data/db'
import { parseCsv } from './csv'
import { discoverTabs, fetchSheetCsv, type Discovery } from './gviz'
import { parseEngTabLite, sheetDateToIso } from './parseEngLite'
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

/** Discover real tabs and cache them in settings (chips + Subjects read this). */
export async function discoverAndStore(): Promise<{ tabs: DiscoveredTab[]; discovery?: Discovery; error?: string }> {
  const settings = await getSettings()
  const id = extractSheetId(settings.sheetUrl)
  if (!id) return { tabs: [], error: 'No Sheet URL in settings · local IDB only.' }
  try {
    const d = await discoverTabs(id)
    await putSettings({ discoveredTabs: d.tabs, discoveredAt: new Date().toISOString() })
    return { tabs: d.tabs, discovery: d }
  } catch (e) {
    return { tabs: settings.discoveredTabs ?? [], error: e instanceof Error ? e.message : String(e) }
  }
}

export async function probeSheet(): Promise<SyncReport> {
  const r = await discoverAndStore()
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

/** t158u — drop demo classes (e.g. Math/Sci) that aren't tabs on the sheet. */
export async function purgeClassesNotOnSheet(onSheet: DiscoveredTab[]): Promise<number> {
  const keep = new Set(onSheet.map((t) => t.classKey))
  if (!keep.size) return 0
  const db = await getDb()
  let n = 0
  for (const k of CLASS_KEYS) {
    if (keep.has(k)) continue
    for (const store of ['students', 'rosterMeta', 'sessions', 'marks'] as const) {
      const keys = await db.getAllKeysFromIndex(store, 'by-class', k)
      for (const key of keys) {
        await db.delete(store, key)
        n++
      }
    }
  }
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

  for (const tab of tabs) {
    const key = tab.classKey
    try {
      const cached = discovery?.csv.get(tab.name)
      const rows = cached != null ? parseCsv(cached) : await fetchSheetCsv(id, tab.name)
      const parsed = parseEngTabLite(key, rows, now)
      const prev = engSyncState[key]
      const stat: TabPullStat = { tab: tab.name, students: 0, marks: 0, kept: 0, warnings: parsed.warnings }

      for (const s of parsed.students) {
        await putStudent(s)
        stat.students++
      }

      // First pull for this key: drop demo leftovers on dates the sheet doesn't have.
      const pulledDates = new Set(parsed.marks.map((m) => m.date))
      if (!prev && parsed.marks.length) {
        for (const old of await listMarks(key)) {
          if (!pulledDates.has(old.date)) await deleteMark(old.markId)
        }
      }

      for (const m of parsed.marks) {
        const existing = await getMark(key, m.roll, m.date)
        // Sync A merge: local edit since last pull wins; submitted is app-only → always kept.
        const localNewer =
          !!prev && !!existing && existing.updatedAt > prev.lastSyncAt && existing.set !== m.set
        if (localNewer) stat.kept++
        await putMark({
          ...m,
          set: localNewer ? existing!.set : m.set,
          submitted: existing?.submitted ?? false,
          updatedAt: localNewer ? existing!.updatedAt : now,
        })
        stat.marks++
      }

      if (parsed.current.date1) {
        const year = Number.parseInt(now.slice(0, 4), 10)
        const prevSession = await getSession(`${key}|current`)
        await putSession({
          sessionId: `${key}|current`,
          classKey: key,
          date1: sheetDateToIso(parsed.current.date1, year),
          topic1: parsed.current.topic1,
          date2: parsed.current.date2 ? sheetDateToIso(parsed.current.date2, year) : '',
          topic2: parsed.current.topic2,
          createdAt: prevSession?.createdAt ?? now,
          updatedAt: now,
        })
      }

      engSyncState[key] = { hash: hashRows(rows), sheetSeenAt: now, lastSyncAt: now }
      pulledStudents += stat.students
      pulledMarks += stat.marks
      perTab.push(stat)
      for (const w of parsed.warnings) errors.push(`${tab.name}: ${w}`)
    } catch (e) {
      errors.push(`${tab.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const ok = pulledStudents > 0 || pulledMarks > 0
  const message = ok
    ? `Pulled ${pulledStudents} students · ${pulledMarks} marks (${perTab.map((t) => `${t.tab} ${t.marks}`).join(' · ')})${errors.length ? ` · ${errors.length} tab warning(s)` : ''}`
    : errors[0] ?? 'Pull returned nothing · sheet may be private or tabs renamed.'

  if (ok) await purgeClassesNotOnSheet((await getSettings()).discoveredTabs ?? tabs)

  await putSettings({
    engSyncState,
    lastSyncAt: ok ? now : settings.lastSyncAt,
    lastSyncError: ok ? (errors.length ? errors.join('; ') : undefined) : message,
    syncDirty: ok ? false : settings.syncDirty,
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

export async function pushLocal(): Promise<SyncReport> {
  const settings = await getSettings()
  const id = extractSheetId(settings.sheetUrl)
  if (!settings.syncUrl || !/script\.google\.com/i.test(settings.syncUrl)) {
    return {
      ok: false,
      message:
        'Push not connected · paste an Apps Script web-app URL (SoWSync) to enable round-trip. Local IDB persist still works offline.',
      mode: 'push',
      pulledStudents: 0,
      pulledMarks: 0,
      pushed: false,
    }
  }
  if (!id) {
    return {
      ok: false,
      message: 'Sheet URL missing · cannot push.',
      mode: 'push',
      pulledStudents: 0,
      pulledMarks: 0,
      pushed: false,
    }
  }

  try {
    const r = await bridgePush(settings.syncUrl, id, {
      note: 'sow-app rewrite push placeholder — full SoW_* payload pending',
    })
    const now = new Date().toISOString()
    await putSettings({
      lastSyncAt: now,
      lastSyncError: r.ok ? undefined : r.message,
      syncDirty: r.ok ? false : true,
    })
    return {
      ok: Boolean(r.ok),
      message: r.message ?? (r.ok ? 'Pushed.' : 'Push failed.'),
      mode: 'push',
      pulledStudents: 0,
      pulledMarks: 0,
      pushed: Boolean(r.ok),
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await putSettings({ lastSyncError: message })
    return {
      ok: false,
      message,
      mode: 'push',
      pulledStudents: 0,
      pulledMarks: 0,
      pushed: false,
    }
  }
}

/**
 * Sync now — one job: pull selected subjects; push only when bridge set AND dirty;
 * otherwise Quiet “saved on device”.
 */
export async function syncNow(subjects: SubjectId[]): Promise<SyncReport> {
  const settings = await getSettings()
  const bridgeReady = Boolean(settings.syncUrl && /script\.google\.com/i.test(settings.syncUrl))
  const dirty = Boolean(settings.syncDirty)

  const pull = await pullSubjects(subjects)

  if (bridgeReady && dirty) {
    const push = await pushLocal()
    const ok = pull.ok || push.ok
    return {
      ok,
      message: [pull.message, push.pushed ? 'Pushed local changes.' : push.message]
        .filter(Boolean)
        .join(' · '),
      mode: 'sync',
      pulledStudents: pull.pulledStudents,
      pulledMarks: pull.pulledMarks,
      pushed: push.pushed,
    }
  }

  if (!bridgeReady) {
    const quiet = 'Marks saved on this device · push when Apps Script bridge is set.'
    return {
      ok: pull.ok || !extractSheetId(settings.sheetUrl), // local-only still ok
      message: pull.ok ? `${pull.message} · ${quiet}` : pull.message.includes('Not connected')
        ? quiet
        : `${pull.message} · ${quiet}`,
      mode: pull.ok ? 'sync' : settings.sheetUrl ? 'sync' : 'local-only',
      pulledStudents: pull.pulledStudents,
      pulledMarks: pull.pulledMarks,
      pushed: false,
    }
  }

  // bridge ready but clean
  return {
    ok: pull.ok,
    message: pull.ok
      ? `${pull.message} · nothing dirty to push.`
      : `${pull.message} · local clean.`,
    mode: 'sync',
    pulledStudents: pull.pulledStudents,
    pulledMarks: pull.pulledMarks,
    pushed: false,
  }
}

/** Re-export for callers that still map all keys. */
export { CLASS_KEYS }
