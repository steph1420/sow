import {
  CLASS_KEYS,
  CLASS_LABELS,
  deleteSession,
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
  type EngSyncState,
  type Mark,
  type RosterMeta,
  type Session,
  type Student,
} from '../db'
import { bridgeEnsureAndPull, bridgePush } from './bridge'
import { fetchSheetCsv, testSheetReadable } from './gviz'
import { applyLeftSeeds } from './leftSeed'
import { mergeByKey } from './merge'
import { mergeEngMarks } from './mergeEng'
import { parseEngTab, sessionFromCurrent } from './parseEng'
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

function looksLikeSheetUrl(url: string): boolean {
  return /docs\.google\.com\/spreadsheets/i.test(url)
}

function looksLikeAppsScript(url: string): boolean {
  return /script\.google\.com/i.test(url)
}

async function upsertStudents(students: Student[]): Promise<void> {
  for (const s of students) await putStudent(s)
}

async function mergeSessions(remote: Session[]): Promise<number> {
  const local = await listSessions()
  const merged = mergeByKey(local, remote, (s) => s.sessionId)
  for (const s of merged) await putSession(s, { keepUpdatedAt: true })
  return remote.length
}

async function mergeMarks(remote: Mark[]): Promise<number> {
  const local: Mark[] = []
  for (const k of CLASS_KEYS) local.push(...(await listMarks(k)))
  const merged = mergeByKey(local, remote, (m) => m.markId)
  for (const m of merged) await putMark({ ...m, markId: m.markId, updatedAt: m.updatedAt })
  return remote.length
}

async function mergeMeta(remote: RosterMeta[]): Promise<number> {
  const local = await listRosterMeta()
  const merged = mergeByKey(local, remote, (m) => m.id)
  for (const m of merged) await putRosterMeta(m)
  return remote.length
}

/** Pull Eng tabs: roster + Current + ticks → sessions/marks; update engSyncState. */
async function pullEngSyncA(sheetId: string): Promise<{
  students: Student[]
  pulledSessions: number
  pulledMarks: number
  engSyncState: Partial<Record<ClassKey, EngSyncState>>
}> {
  const settings = await getSettings()
  const prevState = settings.engSyncState ?? {}
  const nextState: Partial<Record<ClassKey, EngSyncState>> = { ...prevState }
  const allStudents: Student[] = []
  let pulledSessions = 0
  let pulledMarks = 0
  const now = new Date().toISOString()

  for (const key of CLASS_KEYS) {
    let rows: string[][]
    try {
      rows = await fetchSheetCsv(sheetId, TAB[key])
    } catch {
      continue
    }
    const parsed = parseEngTab(key, rows, now)
    allStudents.push(...parsed.students)

    if (parsed.current.date1) {
      const existing = await listSessions(key)
      const prefer =
        existing.find((s) => s.sessionId === `eng-${key}`) ?? existing[0]
      const session = sessionFromCurrent(key, parsed.current, now, prefer)
      await putSession(session)
      // Drop orphan demo sessions so UI list[0] is stable
      for (const s of existing) {
        if (s.sessionId !== session.sessionId) await deleteSession(s.sessionId)
      }
      pulledSessions++
    }

    const prev = prevState[key]
    const hashChanged = !prev || prev.hash !== parsed.hash
    const sheetSeenAt = hashChanged ? now : prev?.sheetSeenAt ?? now
    const lastSyncAt = prev?.lastSyncAt

    const localMarks = await listMarks(key)
    const merged = mergeEngMarks(localMarks, parsed.marks, lastSyncAt)
    for (const m of merged) {
      // Only write marks that are in the Eng tick set or were already local-merged
      await putMark({ ...m, markId: m.markId, updatedAt: m.updatedAt })
    }
    pulledMarks += parsed.marks.length

    nextState[key] = {
      hash: parsed.hash,
      sheetSeenAt,
      lastSyncAt: now,
    }
  }

  await upsertStudents(allStudents)
  return {
    students: allStudents,
    pulledSessions,
    pulledMarks,
    engSyncState: nextState,
  }
}

async function pullSowBackupGviz(sheetId: string): Promise<{
  pulledSessions: number
  pulledMarks: number
  pulledMeta: number
}> {
  let pulledSessions = 0
  let pulledMarks = 0
  let pulledMeta = 0
  for (const [tab, parse, merge] of [
    ['SoW_Sessions', parseSessions, mergeSessions],
    ['SoW_Marks', parseMarks, mergeMarks],
    ['SoW_RosterMeta', parseRosterMeta, mergeMeta],
  ] as const) {
    try {
      const rows = await fetchSheetCsv(sheetId, tab)
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
      /* tab missing — ok */
    }
  }
  return { pulledSessions, pulledMarks, pulledMeta }
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

  let syncUrl = (settings.syncUrl || '').trim()
  if (syncUrl && looksLikeSheetUrl(syncUrl) && !looksLikeAppsScript(syncUrl)) {
    return {
      ok: false,
      message:
        'Sync Web App URL looks like a Sheet link (that causes 405). Clear Sync Web App URL — paste the Sheet only in Google Sheet URL. Sync A pulls Eng tabs without Apps Script.',
      pulledStudents: 0,
      pulledSessions: 0,
      pulledMarks: 0,
      pulledMeta: 0,
      pushed: false,
      mode: 'pull-only',
    }
  }
  if (syncUrl && !looksLikeAppsScript(syncUrl)) {
    return {
      ok: false,
      message:
        'Sync Web App URL should be an Apps Script …/exec link (optional). Clear it to use Sync A pull-only.',
      pulledStudents: 0,
      pulledSessions: 0,
      pulledMarks: 0,
      pulledMeta: 0,
      pushed: false,
      mode: 'pull-only',
    }
  }

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
      mode: syncUrl ? 'round-trip' : 'pull-only',
    }
  }

  // Sync A: always pull Eng Current + ticks
  const eng = await pullEngSyncA(sheetId)
  let pulledStudents = eng.students.length
  let pulledSessions = eng.pulledSessions
  let pulledMarks = eng.pulledMarks
  let pulledMeta = 0
  let pushed = false
  let mode: SyncReport['mode'] = syncUrl ? 'round-trip' : 'pull-only'

  if (syncUrl) {
    const pull = await bridgeEnsureAndPull(syncUrl, sheetId)
    if (!pull.ok) {
      await putSettings({
        engSyncState: eng.engSyncState,
        lastSyncAt: new Date().toISOString(),
        lastSyncError: pull.message || 'Bridge pull failed',
      })
      return {
        ok: false,
        message: pull.message || 'Bridge pull failed',
        pulledStudents,
        pulledSessions,
        pulledMarks,
        pulledMeta: 0,
        pushed: false,
        mode,
      }
    }
    const remoteSessions = parseSessions(pull.sessions ?? [])
    const remoteMarks = parseMarks(pull.marks ?? [])
    let remoteMeta = parseRosterMeta(pull.rosterMeta ?? [])
    remoteMeta = applyLeftSeeds(eng.students, remoteMeta)

    pulledSessions += await mergeSessions(remoteSessions)
    pulledMarks += await mergeMarks(remoteMarks)
    pulledMeta = await mergeMeta(remoteMeta)

    // Re-apply Left clear after remote meta merge
    let meta = await listRosterMeta()
    meta = applyLeftSeeds(eng.students, meta)
    for (const m of meta) await putRosterMeta(m)

    const [sessions, metaOut] = await Promise.all([listSessions(), listRosterMeta()])
    const marks: Mark[] = []
    for (const k of CLASS_KEYS) marks.push(...(await listMarks(k)))

    const push = await bridgePush(syncUrl, sheetId, {
      sessions: sessionsToRows(sessions),
      marks: marksToRows(marks),
      rosterMeta: rosterMetaToRows(metaOut),
    })
    if (!push.ok) {
      await enqueue({ kind: 'pushAll' })
      await putSettings({
        engSyncState: eng.engSyncState,
        lastSyncAt: new Date().toISOString(),
        lastSyncError: push.message || 'push failed',
      })
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
    await putSettings({
      engSyncState: eng.engSyncState,
      lastSyncAt: new Date().toISOString(),
      lastSyncError: '',
      syncDirty: false,
    })
    return {
      ok: true,
      message: `Sync A + bridge OK — ${pulledStudents} students, Current dates/ticks from Eng, ${sessions.length} sessions.`,
      pulledStudents,
      pulledSessions,
      pulledMarks,
      pulledMeta,
      pushed,
      mode,
    }
  }

  // Pull-only: Eng already done; optional SoW_* backup merge
  const backup = await pullSowBackupGviz(sheetId)
  pulledSessions += backup.pulledSessions
  pulledMarks += backup.pulledMarks
  pulledMeta = backup.pulledMeta

  let meta = await listRosterMeta()
  meta = applyLeftSeeds(eng.students, meta)
  for (const m of meta) await putRosterMeta(m)

  const q = await listQueue()
  await putSettings({
    engSyncState: eng.engSyncState,
    lastSyncAt: new Date().toISOString(),
    lastSyncError: '',
    syncDirty: false,
  })

  const dateHint = CLASS_KEYS.map((k) => CLASS_LABELS[k]).join(', ')
  return {
    ok: true,
    message: `Sync A pulled ${pulledStudents} students + Current dates/ticks from Eng (${dateHint}).${q.length ? ` ${q.length} queued write(s) waiting.` : ''} SoW_* stay backup-only.`,
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
  if (syncUrl && looksLikeSheetUrl(syncUrl) && !looksLikeAppsScript(syncUrl)) {
    return {
      ok: false,
      message:
        'Sync Web App URL is a Sheet link — clear it. Sheet URL alone is enough for Sync A (Eng pull).',
    }
  }
  if (!syncUrl) {
    return {
      ok: true,
      message: `${readable.message} Sync A ready (Eng Current + ticks). Apps Script URL optional for SoW_* push.`,
    }
  }
  if (!looksLikeAppsScript(syncUrl)) {
    return {
      ok: false,
      message: 'Sync Web App URL should be script.google.com …/exec (or leave blank).',
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
