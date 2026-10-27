import type { Mark, RosterMeta, Session } from '../db'
import { studentId } from '../db'

function truthy(v: string): boolean {
  const s = v.trim().toUpperCase()
  return s === 'TRUE' || s === '1' || s === 'YES'
}

function headerIndex(header: string[], name: string): number {
  return header.findIndex((h) => h.trim() === name)
}

export function parseSessions(rows: string[][]): Session[] {
  if (rows.length < 2) return []
  const h = rows[0].map((x) => x.trim())
  const i = {
    sessionId: headerIndex(h, 'sessionId'),
    classKey: headerIndex(h, 'classKey'),
    date1: headerIndex(h, 'date1'),
    topic1: headerIndex(h, 'topic1'),
    date2: headerIndex(h, 'date2'),
    topic2: headerIndex(h, 'topic2'),
    createdAt: headerIndex(h, 'createdAt'),
    updatedAt: headerIndex(h, 'updatedAt'),
  }
  if (i.sessionId < 0 || i.classKey < 0) return []
  const out: Session[] = []
  for (const r of rows.slice(1)) {
    const sessionId = (r[i.sessionId] ?? '').trim()
    const classKey = (r[i.classKey] ?? '').trim()
    if (!sessionId || !classKey) continue
    out.push({
      sessionId,
      classKey: classKey as Session['classKey'],
      date1: (r[i.date1] ?? '').trim(),
      topic1: (r[i.topic1] ?? '').trim(),
      date2: (r[i.date2] ?? '').trim(),
      topic2: (r[i.topic2] ?? '').trim(),
      createdAt: (r[i.createdAt] ?? '').trim() || new Date().toISOString(),
      updatedAt: (r[i.updatedAt] ?? '').trim() || new Date().toISOString(),
    })
  }
  return out
}

export function parseMarks(rows: string[][]): Mark[] {
  if (rows.length < 2) return []
  const h = rows[0].map((x) => x.trim())
  const i = {
    markId: headerIndex(h, 'markId'),
    classKey: headerIndex(h, 'classKey'),
    roll: headerIndex(h, 'roll'),
    name: headerIndex(h, 'name'),
    date: headerIndex(h, 'date'),
    topic: headerIndex(h, 'topic'),
    set: headerIndex(h, 'set'),
    submitted: headerIndex(h, 'submitted'),
    updatedAt: headerIndex(h, 'updatedAt'),
  }
  if (i.classKey < 0 || i.roll < 0 || i.date < 0) return []
  const out: Mark[] = []
  for (const r of rows.slice(1)) {
    const classKey = (r[i.classKey] ?? '').trim() as Mark['classKey']
    const roll = Number.parseInt(String(r[i.roll] ?? '').trim(), 10)
    const date = (r[i.date] ?? '').trim()
    if (!classKey || !Number.isFinite(roll) || !date) continue
    const markId =
      (i.markId >= 0 ? (r[i.markId] ?? '').trim() : '') || `${classKey}|${roll}|${date}`
    out.push({
      markId,
      classKey,
      roll,
      name: (r[i.name] ?? '').trim(),
      date,
      topic: (r[i.topic] ?? '').trim(),
      set: truthy(r[i.set] ?? ''),
      submitted: truthy(r[i.submitted] ?? ''),
      updatedAt: (r[i.updatedAt] ?? '').trim() || new Date().toISOString(),
    })
  }
  return out
}

export function parseRosterMeta(rows: string[][]): RosterMeta[] {
  if (rows.length < 2) return []
  const h = rows[0].map((x) => x.trim())
  const i = {
    classKey: headerIndex(h, 'classKey'),
    roll: headerIndex(h, 'roll'),
    name: headerIndex(h, 'name'),
    left: headerIndex(h, 'left'),
    updatedAt: headerIndex(h, 'updatedAt'),
  }
  if (i.classKey < 0 || i.roll < 0) return []
  const out: RosterMeta[] = []
  for (const r of rows.slice(1)) {
    const classKey = (r[i.classKey] ?? '').trim() as RosterMeta['classKey']
    const roll = Number.parseInt(String(r[i.roll] ?? '').trim(), 10)
    if (!classKey || !Number.isFinite(roll)) continue
    out.push({
      id: studentId(classKey, roll),
      classKey,
      roll,
      name: (r[i.name] ?? '').trim(),
      left: truthy(r[i.left] ?? ''),
      updatedAt: (r[i.updatedAt] ?? '').trim() || new Date().toISOString(),
    })
  }
  return out
}

export const SESSION_HEADERS = [
  'sessionId',
  'classKey',
  'date1',
  'topic1',
  'date2',
  'topic2',
  'createdAt',
  'updatedAt',
]
export const MARK_HEADERS = [
  'markId',
  'classKey',
  'roll',
  'name',
  'date',
  'topic',
  'set',
  'submitted',
  'updatedAt',
]
export const ROSTER_META_HEADERS = ['classKey', 'roll', 'name', 'left', 'updatedAt']

export function sessionsToRows(list: Session[]): string[][] {
  return [
    SESSION_HEADERS,
    ...list.map((s) => [
      s.sessionId,
      s.classKey,
      s.date1,
      s.topic1,
      s.date2,
      s.topic2,
      s.createdAt,
      s.updatedAt,
    ]),
  ]
}

export function marksToRows(list: Mark[]): string[][] {
  return [
    MARK_HEADERS,
    ...list.map((m) => [
      m.markId,
      m.classKey,
      String(m.roll),
      m.name,
      m.date,
      m.topic,
      m.set ? 'TRUE' : 'FALSE',
      m.submitted ? 'TRUE' : 'FALSE',
      m.updatedAt,
    ]),
  ]
}

export function rosterMetaToRows(list: RosterMeta[]): string[][] {
  return [
    ROSTER_META_HEADERS,
    ...list.map((m) => [m.classKey, String(m.roll), m.name, m.left ? 'TRUE' : 'FALSE', m.updatedAt]),
  ]
}
