/**
 * Sync engine — Quiet path.
 * Pull: selected subject tabs via gviz when sheet URL is set + readable.
 * Push: requires Apps Script syncUrl — otherwise honest “not connected”.
 * Sync now: pull selected · push iff bridge + dirty · else Quiet local save.
 */
import {
  CLASS_KEYS,
  CLASS_LABELS,
  ENG_CLASS_KEYS,
  classKeysForSubject,
  type ClassKey,
  type SubjectId,
  getSettings,
  putMark,
  putSettings,
  putStudent,
} from '../data'
import { bridgePush } from './bridge'
import { fetchSheetCsv, testSheetReadable } from './gviz'
import { parseEngTabLite } from './parseEngLite'
import { extractSheetId } from './sheetId'

export type SyncReport = {
  ok: boolean
  message: string
  mode: 'local-only' | 'pull' | 'push' | 'probe' | 'sync'
  pulledStudents: number
  pulledMarks: number
  pushed: boolean
}

const TAB: Record<ClassKey, string> = {
  KGA_Eng_CW: 'KGA Eng CW',
  KGB_Eng_CW: 'KGB Eng CW',
  KGA_Eng_HW: 'KGA Eng HW',
  KGB_Eng_HW: 'KGB Eng HW',
  KGA_Math_CW: 'KGA Math CW',
  KGB_Math_HW: 'KGB Math HW',
}

export async function probeSheet(): Promise<SyncReport> {
  const settings = await getSettings()
  const id = extractSheetId(settings.sheetUrl)
  if (!id) {
    return {
      ok: false,
      message: 'No Sheet URL in settings · local IDB only.',
      mode: 'probe',
      pulledStudents: 0,
      pulledMarks: 0,
      pushed: false,
    }
  }
  const r = await testSheetReadable(id)
  await putSettings({
    lastSyncError: r.ok ? undefined : r.message,
  })
  return {
    ok: r.ok,
    message: r.message,
    mode: 'probe',
    pulledStudents: 0,
    pulledMarks: 0,
    pushed: false,
  }
}

async function pullKeys(keys: ClassKey[]): Promise<SyncReport> {
  const settings = await getSettings()
  const id = extractSheetId(settings.sheetUrl)
  if (!id) {
    return {
      ok: false,
      message:
        'Not connected · set a Google Sheet URL to pull subject tabs. Local marks stay in IDB.',
      mode: 'pull',
      pulledStudents: 0,
      pulledMarks: 0,
      pushed: false,
    }
  }

  if (!keys.length) {
    return {
      ok: false,
      message: 'No tabs for the selected subjects yet · marks stay on this device.',
      mode: 'pull',
      pulledStudents: 0,
      pulledMarks: 0,
      pushed: false,
    }
  }

  const now = new Date().toISOString()
  let pulledStudents = 0
  let pulledMarks = 0
  const errors: string[] = []

  for (const key of keys) {
    try {
      const rows = await fetchSheetCsv(id, TAB[key])
      const parsed = parseEngTabLite(key, rows, now)
      for (const s of parsed.students) {
        await putStudent(s)
        pulledStudents++
      }
      for (const m of parsed.marks) {
        await putMark({ ...m, updatedAt: m.updatedAt })
        pulledMarks++
      }
    } catch (e) {
      errors.push(`${CLASS_LABELS[key]}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const ok = pulledStudents > 0 || pulledMarks > 0
  const message = ok
    ? `Pulled ${pulledStudents} students · ${pulledMarks} marks${errors.length ? ` · ${errors.length} tab warning(s)` : ''}`
    : errors[0] ?? 'Pull returned nothing · sheet may be private or tabs renamed.'

  await putSettings({
    lastSyncAt: ok ? now : settings.lastSyncAt,
    lastSyncError: ok ? (errors.length ? errors.join('; ') : undefined) : message,
    syncDirty: ok ? false : settings.syncDirty,
  })

  return {
    ok,
    message,
    mode: 'pull',
    pulledStudents,
    pulledMarks,
    pushed: false,
  }
}

/** Pull Eng tabs only (internal name kept; UI says subject tabs). */
export async function pullEng(): Promise<SyncReport> {
  return pullKeys(ENG_CLASS_KEYS)
}

/** Pull class keys for the selected this-run subjects. */
export async function pullSubjects(subjects: SubjectId[]): Promise<SyncReport> {
  const keys: ClassKey[] = []
  const missing: string[] = []
  for (const s of subjects) {
    const ks = classKeysForSubject(s)
    if (!ks.length) missing.push(s)
    else keys.push(...ks)
  }
  if (!keys.length) {
    return {
      ok: false,
      message: missing.length
        ? `${missing.join(' · ')} not on sheet yet · marks stay on this device.`
        : 'Select at least one subject tab.',
      mode: 'pull',
      pulledStudents: 0,
      pulledMarks: 0,
      pushed: false,
    }
  }
  const report = await pullKeys(keys)
  if (missing.length && report.ok) {
    return {
      ...report,
      message: `${report.message} · ${missing.join(' · ')} skipped (no tabs yet)`,
    }
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
      note: 'sow-app rewrite push placeholder — full SoW_* payload Phase E+',
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
