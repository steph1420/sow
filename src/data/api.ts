import { getDb } from './db'
import type { ClassKey, Mark, RosterMeta, Session, Settings, Student } from './types'
import { markId as makeMarkId, studentId } from './types'

const now = () => new Date().toISOString()

async function markDirty(): Promise<void> {
  const db = await getDb()
  const cur = (await db.get('settings', 'app')) ?? {
    id: 'app' as const,
    hideLeft: false,
    sheetUrl: '',
    syncUrl: '',
    theme: 'night' as const,
  }
  if (!cur.syncDirty) await db.put('settings', { ...cur, id: 'app', syncDirty: true })
}

export async function getSettings(): Promise<Settings> {
  const db = await getDb()
  const s = await db.get('settings', 'app')
  const base: Settings = {
    id: 'app',
    hideLeft: false,
    sheetUrl: '',
    syncUrl: '',
    theme: 'night',
  }
  return s ? { ...base, ...s, id: 'app' } : base
}

export async function putSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const db = await getDb()
  const cur = await getSettings()
  const next: Settings = { ...cur, ...patch, id: 'app' }
  await db.put('settings', next)
  return next
}

export async function putStudent(s: Student): Promise<void> {
  const db = await getDb()
  await db.put('students', { ...s, id: studentId(s.classKey, s.roll) })
}

export async function listStudents(classKey?: ClassKey): Promise<Student[]> {
  const db = await getDb()
  if (classKey) return db.getAllFromIndex('students', 'by-class', classKey)
  return db.getAll('students')
}

export async function putRosterMeta(m: Omit<RosterMeta, 'id' | 'updatedAt'> & { updatedAt?: string }): Promise<RosterMeta> {
  const db = await getDb()
  const row: RosterMeta = {
    ...m,
    id: studentId(m.classKey, m.roll),
    updatedAt: m.updatedAt ?? now(),
  }
  await db.put('rosterMeta', row)
  await markDirty()
  return row
}

export async function listRosterMeta(classKey?: ClassKey): Promise<RosterMeta[]> {
  const db = await getDb()
  if (classKey) return db.getAllFromIndex('rosterMeta', 'by-class', classKey)
  return db.getAll('rosterMeta')
}

export async function setLeft(classKey: ClassKey, roll: number, left: boolean, name = ''): Promise<RosterMeta> {
  const db = await getDb()
  const id = studentId(classKey, roll)
  const existing = await db.get('rosterMeta', id)
  return putRosterMeta({
    classKey,
    roll,
    name: name || existing?.name || '',
    left,
  })
}

export async function putSession(
  s: Session,
  opts?: { keepUpdatedAt?: boolean; fromSheet?: boolean },
): Promise<Session> {
  const db = await getDb()
  const row = { ...s, updatedAt: opts?.keepUpdatedAt ? s.updatedAt : now() }
  await db.put('sessions', row)
  if (!opts?.fromSheet) await markDirty()
  return row
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDb()
  await db.delete('sessions', sessionId)
}

export async function listSessions(classKey?: ClassKey): Promise<Session[]> {
  const db = await getDb()
  if (classKey) return db.getAllFromIndex('sessions', 'by-class', classKey)
  return db.getAll('sessions')
}

export async function getSession(sessionId: string): Promise<Session | undefined> {
  const db = await getDb()
  return db.get('sessions', sessionId)
}

export async function putMark(
  input: Omit<Mark, 'markId' | 'updatedAt'> & { markId?: string; updatedAt?: string },
  /** v0.29.2: sheet/sync writes are not local changes → don't mark the device dirty. */
  opts?: { fromSheet?: boolean },
): Promise<Mark> {
  const db = await getDb()
  const row: Mark = {
    ...input,
    markId: input.markId ?? makeMarkId(input.classKey, input.roll, input.date),
    updatedAt: input.updatedAt ?? now(),
  }
  await db.put('marks', row)
  if (!opts?.fromSheet) await markDirty()
  return row
}

export async function getMark(classKey: ClassKey, roll: number, date: string): Promise<Mark | undefined> {
  const db = await getDb()
  return db.get('marks', makeMarkId(classKey, roll, date))
}

export async function deleteMark(markId: string, opts?: { fromSheet?: boolean }): Promise<void> {
  const db = await getDb()
  await db.delete('marks', markId)
  if (!opts?.fromSheet) await markDirty()
}

export async function listMarks(classKey: ClassKey, date?: string): Promise<Mark[]> {
  const db = await getDb()
  if (date) return db.getAllFromIndex('marks', 'by-class-date', [classKey, date])
  return db.getAllFromIndex('marks', 'by-class', classKey)
}

export async function toggleMarkField(
  classKey: ClassKey,
  roll: number,
  date: string,
  field: 'set' | 'submitted',
  name: string,
  topic: string,
): Promise<Mark> {
  const existing = await getMark(classKey, roll, date)
  return putMark({
    classKey,
    roll,
    name,
    date,
    topic,
    set: field === 'set' ? !existing?.set : !!existing?.set,
    submitted: field === 'submitted' ? !existing?.submitted : !!existing?.submitted,
  })
}

/** Check/uncheck all visible active rows for one date + mode. */
export async function setAllMarks(
  classKey: ClassKey,
  date: string,
  topic: string,
  field: 'set' | 'submitted',
  value: boolean,
  students: { roll: number; name: string; left: boolean }[],
): Promise<number> {
  let n = 0
  for (const s of students) {
    if (s.left) continue
    const existing = await getMark(classKey, s.roll, date)
    await putMark({
      classKey,
      roll: s.roll,
      name: s.name,
      date,
      topic,
      set: field === 'set' ? value : !!existing?.set,
      submitted: field === 'submitted' ? value : !!existing?.submitted,
    })
    n++
  }
  return n
}

export async function rosterWithLeft(classKey: ClassKey): Promise<
  (Student & { left: boolean })[]
> {
  const [students, meta] = await Promise.all([listStudents(classKey), listRosterMeta(classKey)])
  const leftMap = new Map(meta.map((m) => [m.id, m.left]))
  return students
    .map((s) => ({ ...s, left: leftMap.get(s.id) ?? false }))
    .sort((a, b) => a.roll - b.roll)
}
