/**
 * v0.33.0 push bridge client (Q-FIX-9 → A). Talks to apps-script/Code.js (schema 1).
 * Sheet layout: docs/SHEET_LAYOUT_PLAN.md — Roster · Subjects · Sessions · Ticks.
 * Ids: sessionId = subjectKey|yyyy-mm-dd, tickId = sessionId|roll; subjectKey == app ClassKey,
 * the Roster's classKey is the section (KGA) — Left applies to every subject of that section (Q-SHEET-3A).
 */
import {
  CLASS_KEYS,
  CLASS_LABELS,
  markId,
  studentId,
  subjectOf,
  type ClassKey,
  type DiscoveredTab,
  type Mark,
  type RosterMeta,
  type Session,
  type Student,
} from '../data/types'
import { fetchSheetCsv } from './gviz'

export type BridgeSubject = { subjectKey: string; classKey: string; subject: string; kind: string; active: boolean; order?: number }
export type BridgePupil = { classKey: string; roll: number; name: string; status: 'Active' | 'Left'; updatedAt: string }
export type BridgeSession = { sessionId: string; subjectKey: string; classKey: string; date: string; topic: string; status: string; updatedAt: string }
export type BridgeTick = { tickId: string; sessionId: string; subjectKey: string; classKey: string; roll: number; set: boolean; updatedAt: string }
export type BridgeState = {
  ok: true
  schema: number
  subjects: BridgeSubject[]
  roster: BridgePupil[]
  sessions: BridgeSession[]
  ticks: BridgeTick[]
}
export type PushTick = { subjectKey: string; date: string; topic: string; roll: number; set: boolean; updatedAt: string }
export type PushPupil = { classKey: string; roll: number; status: 'Active' | 'Left'; updatedAt: string }
export type PushPayload = { ticks: PushTick[]; roster: PushPupil[] }
export type PushResult = { ok: true; applied: number; ignored: number; rejected: string[]; state: BridgeState }

export class BridgeError extends Error {
  constructor(message: string, public readonly network = false) {
    super(message)
    this.name = 'BridgeError'
  }
}

export const sectionOf = (key: string): string => String(key).split('_')[0] ?? ''
const isClassKey = (k: string): k is ClassKey => (CLASS_KEYS as string[]).includes(k)

/** POST as text/plain so the browser sends no CORS preflight (Apps Script can't answer one). */
export async function bridgeCall<T>(url: string, body: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
    })
  } catch (e) {
    throw new BridgeError(e instanceof Error ? e.message : String(e), true)
  }
  if (!res.ok) throw new BridgeError(`Bridge HTTP ${res.status}`)
  let json: { ok?: boolean; error?: string }
  try {
    json = (await res.json()) as { ok?: boolean; error?: string }
  } catch {
    throw new BridgeError('Bridge did not answer JSON · check the web app URL and that it is deployed for “Anyone”')
  }
  if (!json.ok) throw new BridgeError(json.error === 'bad token' ? 'Bridge refused the token · copy it again from SoW > Show app token' : `Bridge: ${json.error ?? 'error'}`)
  return json as T
}

/** Marks/Left changed on this device since `since`. First bridge sync (no `since`) sends only ticks that differ from their sheet baseline. */
export function buildPushPayload(marks: Mark[], meta: RosterMeta[], since: string | undefined): PushPayload {
  const ticks: PushTick[] = marks
    .filter((m) => (since ? m.updatedAt > since : m.sheetSet !== undefined && m.set !== m.sheetSet))
    .map((m) => ({ subjectKey: m.classKey, date: m.date, topic: m.topic, roll: m.roll, set: m.set, updatedAt: m.updatedAt }))
  const bySection = new Map<string, PushPupil>()
  for (const r of meta) {
    if (since ? r.updatedAt <= since : true) continue
    const k = `${sectionOf(r.classKey)}|${r.roll}`
    const prev = bySection.get(k)
    if (!prev || r.updatedAt > prev.updatedAt) bySection.set(k, { classKey: sectionOf(r.classKey), roll: r.roll, status: r.left ? 'Left' : 'Active', updatedAt: r.updatedAt })
  }
  return { ticks, roster: [...bySection.values()] }
}

export type AppState = {
  tabs: DiscoveredTab[]
  skipped: string[]
  students: Student[]
  left: Omit<RosterMeta, 'id'>[]
  marks: Mark[]
  sessions: Session[]
}

/** Sheet state → app records (pure). Subjects the app doesn't model yet are skipped, never invented. */
export function stateToApp(s: BridgeState): AppState {
  const keys = s.subjects.filter((x) => x.active !== false).map((x) => x.subjectKey)
  const known = keys.filter(isClassKey)
  const skipped = keys.filter((k) => !isClassKey(k))
  const tabs: DiscoveredTab[] = known.map((k) => ({ name: CLASS_LABELS[k], classKey: k, subject: subjectOf(k) }))
  const students: Student[] = []
  const left: AppState['left'] = []
  for (const k of known) {
    for (const p of s.roster.filter((r) => r.classKey === sectionOf(k)).sort((a, b) => a.roll - b.roll)) {
      students.push({ id: studentId(k, p.roll), classKey: k, roll: p.roll, name: p.name })
      left.push({ classKey: k, roll: p.roll, name: p.name, left: p.status === 'Left', updatedAt: p.updatedAt })
    }
  }
  const sesById = new Map(s.sessions.map((x) => [x.sessionId, x]))
  const name = (sec: string, roll: number) => s.roster.find((r) => r.classKey === sec && r.roll === roll)?.name ?? ''
  const marks: Mark[] = []
  for (const t of s.ticks) {
    if (!isClassKey(t.subjectKey) || !known.includes(t.subjectKey)) continue
    const ses = sesById.get(t.sessionId)
    const date = ses?.date ?? t.sessionId.split('|')[1] ?? ''
    if (!date) continue
    marks.push({
      markId: markId(t.subjectKey, t.roll, date),
      classKey: t.subjectKey,
      roll: t.roll,
      name: name(t.classKey, t.roll),
      date,
      topic: ses?.topic ?? '',
      set: t.set,
      submitted: false,
      updatedAt: t.updatedAt,
      sheetSet: t.set,
    })
  }
  const sessions: Session[] = []
  for (const k of known) {
    const mine = s.sessions.filter((x) => x.subjectKey === k && x.status !== 'Completed').sort((a, b) => b.date.localeCompare(a.date))
    if (!mine.length) continue
    sessions.push({
      sessionId: `${k}|current`,
      classKey: k,
      date1: mine[0]!.date,
      topic1: mine[0]!.topic,
      date2: mine[1]?.date ?? '',
      topic2: mine[1]?.topic ?? '',
      createdAt: mine[0]!.updatedAt,
      updatedAt: mine[0]!.updatedAt,
    })
  }
  return { tabs, skipped, students, left, marks, sessions }
}

const HEAD = { Subjects: 'subjectKey', Roster: 'classKey', Sessions: 'sessionId', Ticks: 'tickId' } as const
type TabName = keyof typeof HEAD

function toIsoDate(v: string): string {
  const s = String(v ?? '').trim()
  const iso = s.match(/^(\d{4})-(\d\d)-(\d\d)/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  return dmy ? `${dmy[3]}-${dmy[2]!.padStart(2, '0')}-${dmy[1]!.padStart(2, '0')}` : ''
}
const bool = (v: string) => String(v).trim().toUpperCase() === 'TRUE'

/** gviz fallback (read only): the same four tabs as CSV → BridgeState. */
export function stateFromCsv(tabs: Record<TabName, string[][]>): BridgeState {
  const rows = (n: TabName) => {
    const [head = [], ...rest] = tabs[n]
    if (String(head[0] ?? '').trim() !== HEAD[n]) throw new Error(`Tab “${n}” is not the SoW layout`)
    const ix = (h: string) => head.indexOf(h)
    return rest.filter((r) => String(r[0] ?? '').trim()).map((r) => (h: string) => String(r[ix(h)] ?? '').trim())
  }
  return {
    ok: true,
    schema: 1,
    subjects: rows('Subjects').map((g) => ({ subjectKey: g('subjectKey'), classKey: g('classKey'), subject: g('subject'), kind: g('kind'), active: g('active') === '' || bool(g('active')) })),
    roster: rows('Roster').map((g) => ({ classKey: g('classKey'), roll: Number(g('roll')), name: g('name'), status: g('status') === 'Left' ? 'Left' : 'Active', updatedAt: g('updatedAt') })),
    sessions: rows('Sessions').map((g) => ({ sessionId: g('sessionId'), subjectKey: g('subjectKey'), classKey: g('classKey'), date: toIsoDate(g('date')), topic: g('topic'), status: g('status') || 'Open', updatedAt: g('updatedAt') })),
    ticks: rows('Ticks').map((g) => ({ tickId: g('tickId'), sessionId: g('sessionId'), subjectKey: g('subjectKey'), classKey: g('classKey'), roll: Number(g('roll')), set: bool(g('set')), updatedAt: g('updatedAt') })),
  }
}

export async function gvizState(sheetId: string): Promise<BridgeState> {
  const names = Object.keys(HEAD) as TabName[]
  const got = await Promise.all(names.map((n) => fetchSheetCsv(sheetId, n)))
  return stateFromCsv(Object.fromEntries(names.map((n, i) => [n, got[i]!])) as Record<TabName, string[][]>)
}
