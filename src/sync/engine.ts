import {
  CLASS_KEYS,
  CLASS_LABELS,
  getSettings,
  listMarks,
  listRosterMeta,
  listSessions,
  putMark,
  putRosterMeta,
  putSession,
  putSettings,
  putStudent,
  type ClassKey,
  type Mark,
  type RosterMeta,
  type Session,
  type Student,
} from '../db'
import { bridgeEnsureAndPull, bridgePush } from './bridge'
import { fetchSheetCsv, testSheetReadable } from './gviz'
import { applyLeftSeeds } from './leftSeed'
import { mergeByKey } from './merge'
import { parseRosterRows } from './parseRoster'
import {
  marksToRows,
  parseMarks,
  parseRosterMeta,
  parseSessions,
  rosterMetaToRows,
  sessionsToRows,
} from './parseSow'
import { clearQueue, enqueue, listQueue } from './queue'
import { extractSheetId } from './sheetId'

export type SyncReport = {
  ok: boolean
  message: string
  pulledStudents: number
  pulledSessions: number
  pulledMarks: number
  pulledMeta: number
  pushed: boolean
  mode: 'pull-only' | 'round-trip'
}

const TAB: Record<ClassKey, string> = {
  KGA_Eng_CW: 'KGA Eng CW',
  KGB_Eng_CW: 'KGB Eng CW',
  KGA_Eng_HW: 'KGA Eng HW',
  KGB_Eng_HW: 'KGB Eng HW',
}

async function pullRosterGviz(sheetId: string): Promise<Student[]> {
  const all: Student[] = []
  for (const key of CLASS_KEYS) {
    try {
      const rows = await fetchSheetCsv(sheetId, TAB[key])
      all.push(...parseRosterRows(key, rows))
    } catch {
      // tab missing — skip
    }
  }
  return all
}

async function upsertStudents(students: Student[]): Promise<void> {
  for (const s of students) await putStudent(s)
}

async function mergeSessions(remote: Session[]): Promise<number> {
  const local = await listSessions()
  const merged = mergeByKey(local, remote, (s) => s.sessionId)
  for (const s of merged) await putSession(s)
  return remote.length
}

async function mergeMarks(remote: Mark[]): Promise<number> {
  // list all marks by walking classes
  const local: Mark[] = []
  for (const k of CLASS_KEYS) local.push(...(await listMarks(k)))
  const merged = mergeByKey(local, remote, (m) => m.markId)
  for (const m of merged) await putMark(m)
  return remote.length
}

async function mergeMeta(remote: RosterMeta[]): Promise<number> {
  const local = await listRosterMeta()
  const merged = mergeByKey(local, remote, (m) => m.id)
  for (const m of merged) await putRosterMeta(m)
  return remote.length
}

export async function runSync(): Promise<SyncReport> {
  const settings = await getSettings()
  const sheetId = extractSheetId(settings.sheetUrl || '')
  if (!sheetId) {
    return {
      ok: false,
      message: 'Set a Google Sheet URL in Settings first.',
      pulledStudents: 0,
      pulledSessions: 0,
      pulledMarks: 0,
      pulledMeta: 0,
      pushed: false,
      mode: 'pull-only',
    }
  }

  const syncUrl = (settings.syncUrl || '').trim()
  let pulledStudents = 0
  let pulledSessions = 0
  let pulledMarks = 0
  let pulledMeta = 0
  let pushed = false
  let mode: SyncReport['mode'] = 'pull-only'

  if (syncUrl) {
    mode = 'round-trip'
    // Pull via bridge (creates SoW_* if needed)
    const pull = await bridgeEnsureAndPull(syncUrl, sheetId)
    if (!pull.ok) {
      return {
        ok: false,
        message: pull.message || 'Bridge pull failed',
        pulledStudents: 0,
        pulledSessions: 0,
        pulledMarks: 0,
        pulledMeta: 0,
        pushed: false,
        mode,
      }
    }
    // Roster still from teaching tabs via gviz (read-only rule)
    const students = await pullRosterGviz(sheetId)
    await upsertStudents(students)
    pulledStudents = students.length

    const remoteSessions = parseSessions(pull.sessions ?? [])
    const remoteMarks = parseMarks(pull.marks ?? [])
    let remoteMeta = parseRosterMeta(pull.rosterMeta ?? [])
    remoteMeta = applyLeftSeeds(students, remoteMeta)

    pulledSessions = await mergeSessions(remoteSessions)
    pulledMarks = await mergeMarks(remoteMarks)
    pulledMeta = await mergeMeta(remoteMeta)

    // Push authoritative local SoW_* 
    const [sessions, meta] = await Promise.all([listSessions(), listRosterMeta()])
    const marks: Mark[] = []
    for (const k of CLASS_KEYS) marks.push(...(await listMarks(k)))

    const push = await bridgePush(syncUrl, sheetId, {
      sessions: sessionsToRows(sessions),
      marks: marksToRows(marks),
      rosterMeta: rosterMetaToRows(meta),
    })
    if (!push.ok) {
      await enqueue({ kind: 'pushAll' })
      await putSettings({ lastSyncAt: new Date().toISOString(), lastSyncError: push.message || 'push failed' })
      return {
        ok: false,
        message: push.message || 'Push failed — queued for retry',
        pulledStudents,
        pulledSessions,
        pulledMarks,
        pulledMeta,
        pushed: false,
        mode,
      }
    }
    pushed = true
    await clearQueue()
    await putSettings({ lastSyncAt: new Date().toISOString(), lastSyncError: '', syncDirty: false })
    return {
      ok: true,
      message: `Round-trip OK — ${pulledStudents} students, ${sessions.length} sessions, ${marks.length} marks.`,
      pulledStudents,
      pulledSessions,
      pulledMarks,
      pulledMeta,
      pushed,
      mode,
    }
  }

  // Pull-only (no bridge): roster via gviz; SoW_* if tabs exist
  const probe = await testSheetReadable(sheetId)
  if (!probe.ok) {
    return {
      ok: false,
      message: probe.message,
      pulledStudents: 0,
      pulledSessions: 0,
      pulledMarks: 0,
      pulledMeta: 0,
      pushed: false,
      mode,
    }
  }

  const students = await pullRosterGviz(sheetId)
  await upsertStudents(students)
  pulledStudents = students.length

  for (const [tab, parse, merge] of [
    ['SoW_Sessions', parseSessions, mergeSessions],
    ['SoW_Marks', parseMarks, mergeMarks],
    ['SoW_RosterMeta', parseRosterMeta, mergeMeta],
  ] as const) {
    try {
      const rows = await fetchSheetCsv(sheetId, tab)
      // Guard: if sheet fell back to teaching tab, headers won't match
      const header = (rows[0] ?? []).join(',')
      if (tab === 'SoW_Sessions' && !header.includes('sessionId')) continue
      if (tab === 'SoW_Marks' && !header.includes('markId') && !header.includes('submitted')) continue
      if (tab === 'SoW_RosterMeta' && !header.includes('left')) continue
      const remote = parse(rows) as never
      const n = await merge(remote as never)
      if (tab === 'SoW_Sessions') pulledSessions = n
      if (tab === 'SoW_Marks') pulledMarks = n
      if (tab === 'SoW_RosterMeta') pulledMeta = n
    } catch {
      /* tab missing — ok in pull-only */
    }
  }

  let meta = await listRosterMeta()
  meta = applyLeftSeeds(students, meta)
  for (const m of meta) await putRosterMeta(m)

  const q = await listQueue()
  await putSettings({
    lastSyncAt: new Date().toISOString(),
    lastSyncError: '',
    syncDirty: false,
  })

  return {
    ok: true,
    message: `Pulled ${pulledStudents} students from teaching tabs (${CLASS_KEYS.map((k) => CLASS_LABELS[k]).join(', ')}). Add Sync Web App URL for push / create SoW_* tabs.${q.length ? ` ${q.length} queued write(s) waiting.` : ''}`,
    pulledStudents,
    pulledSessions,
    pulledMarks,
    pulledMeta,
    pushed: false,
    mode,
  }
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  const settings = await getSettings()
  const sheetId = extractSheetId(settings.sheetUrl || '')
  if (!sheetId) return { ok: false, message: 'Paste a Google Sheet URL first.' }
  const readable = await testSheetReadable(sheetId)
  if (!readable.ok) return readable
  const syncUrl = (settings.syncUrl || '').trim()
  if (!syncUrl) {
    return {
      ok: true,
      message: `${readable.message} Pull-only until you paste the Apps Script Web App URL (see docs/SYNC_SETUP.md).`,
    }
  }
  try {
    const r = await bridgeEnsureAndPull(syncUrl, sheetId)
    return {
      ok: !!r.ok,
      message: r.ok
        ? 'Sheet + sync bridge OK — SoW_* tabs ready.'
        : r.message || 'Bridge error',
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}
