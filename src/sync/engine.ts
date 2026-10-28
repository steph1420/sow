/**
 * Sync engine — rewritten Quiet path (ideas from sow-pwa Sync A, not UI).
 * Pull: Eng tabs via gviz when sheet URL is set + readable.
 * Push: requires Apps Script syncUrl — otherwise honest “not connected”.
 */
import {
  CLASS_KEYS,
  CLASS_LABELS,
  type ClassKey,
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
  mode: 'local-only' | 'pull' | 'push' | 'probe'
  pulledStudents: number
  pulledMarks: number
  pushed: boolean
}

const TAB: Record<ClassKey, string> = {
  KGA_Eng_CW: 'KGA Eng CW',
  KGB_Eng_CW: 'KGB Eng CW',
  KGA_Eng_HW: 'KGA Eng HW',
  KGB_Eng_HW: 'KGB Eng HW',
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

export async function pullEng(): Promise<SyncReport> {
  const settings = await getSettings()
  const id = extractSheetId(settings.sheetUrl)
  if (!id) {
    return {
      ok: false,
      message: 'Not connected · set a Google Sheet URL to pull Eng tabs. Local marks stay in IDB.',
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

  for (const key of CLASS_KEYS) {
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
