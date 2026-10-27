import type { ClassKey, Mark, Session, Student } from '../db'
import { markId, studentId } from '../db'

/** Sheet col F = index 5; tick scan is C..(F-1). */
export const CURRENT_COL = 5
export const TICK_START_COL = 2

const DATE_RE = /\b(\d{1,2}\/\d{1,2})\b/

export function extractDate(text: string): string {
  const m = String(text ?? '').trim().match(DATE_RE)
  return m ? m[1] : ''
}

export function parseBoolCell(raw: string): boolean | null {
  const s = String(raw ?? '').trim().toUpperCase()
  if (s === 'TRUE' || s === '1' || s === 'YES') return true
  if (s === 'FALSE' || s === '0' || s === 'NO') return false
  return null
}

export function findRosterStart(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const roll = Number.parseInt(String(rows[i]?.[0] ?? '').trim(), 10)
    const name = String(rows[i]?.[1] ?? '').trim()
    if (Number.isFinite(roll) && roll > 0 && name) return i
  }
  return -1
}

export type EngCurrent = {
  date1: string
  topic1: string
  date2: string
  topic2: string
}

/** Current block: prefer F3/G3 + F4/G4; fall back to dates embedded in the Current header. */
export function parseCurrent(rows: string[][]): EngCurrent {
  const header = rows[0] ?? []
  let currentCol = CURRENT_COL
  for (let c = 0; c < header.length; c++) {
    if (/current/i.test(String(header[c] ?? ''))) {
      currentCol = c
      break
    }
  }
  const topicCol = currentCol + 1

  let date1 = extractDate(rows[2]?.[currentCol] ?? '')
  let topic1 = String(rows[2]?.[topicCol] ?? '').trim()
  let date2 = extractDate(rows[3]?.[currentCol] ?? '')
  let topic2 = String(rows[3]?.[topicCol] ?? '').trim()

  if (!date1) {
    date1 = extractDate(header[currentCol] ?? '')
    if (!topic1) {
      topic1 = String(header[topicCol] ?? '')
        .replace(/topic/i, '')
        .trim()
      if (!topic1) {
        const h = String(header[currentCol] ?? '')
        topic1 = h.replace(/current/i, '').replace(DATE_RE, '').replace(/date/i, '').trim()
      }
    }
  }

  // Don't treat non-date F4 (rare) as date2
  if (date2 && !DATE_RE.test(date2)) date2 = ''

  return { date1, topic1, date2, topic2 }
}

export type EngTickColumn = {
  col: number
  date: string
  topic: string
}

/**
 * Tick cols C → before Current. Dates from row2, else header, else Current dates LTR.
 */
export function parseTickColumns(rows: string[][], current: EngCurrent): EngTickColumn[] {
  const header = rows[0] ?? []
  const row2 = rows[1] ?? []
  const rosterStart = findRosterStart(rows)
  if (rosterStart < 0) return []

  let currentCol = CURRENT_COL
  for (let c = 0; c < header.length; c++) {
    if (/current/i.test(String(header[c] ?? ''))) {
      currentCol = c
      break
    }
  }

  const candidates: { col: number; headerDate: string; row2Date: string; hasBool: boolean }[] = []
  for (let col = TICK_START_COL; col < currentCol; col++) {
    let hasBool = false
    for (let r = rosterStart; r < rows.length; r++) {
      if (parseBoolCell(rows[r]?.[col] ?? '') !== null) {
        hasBool = true
        break
      }
    }
    const headerDate = extractDate(header[col] ?? '')
    const row2Date = extractDate(row2[col] ?? '')
    if (!hasBool && !headerDate && !row2Date) continue
    candidates.push({ col, headerDate, row2Date, hasBool })
  }

  const currentDates = [
    { date: current.date1, topic: current.topic1 },
    { date: current.date2, topic: current.topic2 },
  ].filter((d) => d.date)
  let currentIdx = 0
  const usedDates = new Set<string>()

  const out: EngTickColumn[] = []
  for (const c of candidates) {
    let date = c.row2Date || c.headerDate
    let topic = ''
    if (date) {
      topic = String(rows[2]?.[c.col] ?? '').trim()
      if (!topic || extractDate(topic)) {
        const match = currentDates.find((d) => d.date === date)
        topic = match?.topic ?? ''
      }
      usedDates.add(date)
      while (currentIdx < currentDates.length && usedDates.has(currentDates[currentIdx].date)) {
        currentIdx++
      }
    } else {
      while (currentIdx < currentDates.length && usedDates.has(currentDates[currentIdx].date)) {
        currentIdx++
      }
      if (currentIdx < currentDates.length) {
        date = currentDates[currentIdx].date
        topic = currentDates[currentIdx].topic
        usedDates.add(date)
        currentIdx++
      } else {
        continue // no date → skip column
      }
    }
    out.push({ col: c.col, date, topic })
  }
  return out
}

export function parseEngRoster(classKey: ClassKey, rows: string[][]): Student[] {
  const start = findRosterStart(rows)
  if (start < 0) return []
  const out: Student[] = []
  const seen = new Set<number>()
  for (let i = start; i < rows.length; i++) {
    const roll = Number.parseInt(String(rows[i]?.[0] ?? '').trim(), 10)
    const name = String(rows[i]?.[1] ?? '').trim()
    if (!Number.isFinite(roll) || roll <= 0 || !name) continue
    if (seen.has(roll)) continue
    seen.add(roll)
    out.push({ id: studentId(classKey, roll), classKey, roll, name })
  }
  return out
}

export function parseEngMarks(
  classKey: ClassKey,
  rows: string[][],
  ticks: EngTickColumn[],
  students: Student[],
  updatedAt: string,
): Mark[] {
  const start = findRosterStart(rows)
  if (start < 0 || !ticks.length) return []
  const nameByRoll = new Map(students.map((s) => [s.roll, s.name]))
  const out: Mark[] = []
  for (let i = start; i < rows.length; i++) {
    const roll = Number.parseInt(String(rows[i]?.[0] ?? '').trim(), 10)
    if (!Number.isFinite(roll) || roll <= 0) continue
    const name = nameByRoll.get(roll) ?? String(rows[i]?.[1] ?? '').trim()
    if (!name) continue
    for (const t of ticks) {
      const setVal = parseBoolCell(rows[i]?.[t.col] ?? '')
      if (setVal === null) continue
      out.push({
        markId: markId(classKey, roll, t.date),
        classKey,
        roll,
        name,
        date: t.date,
        topic: t.topic,
        set: setVal,
        submitted: false, // Eng has no submitted; merge keeps local submitted
        updatedAt,
      })
    }
  }
  return out
}

/** Stable hash of Current + tick dates + TRUE/FALSE body for change detection. */
export function hashEngBlock(rows: string[][], current: EngCurrent, ticks: EngTickColumn[]): string {
  const start = findRosterStart(rows)
  const parts: string[] = [
    `d1:${current.date1}|${current.topic1}`,
    `d2:${current.date2}|${current.topic2}`,
  ]
  for (const t of ticks) {
    parts.push(`t:${t.col}:${t.date}|${t.topic}`)
    if (start >= 0) {
      for (let i = start; i < rows.length; i++) {
        const roll = String(rows[i]?.[0] ?? '').trim()
        const v = String(rows[i]?.[t.col] ?? '').trim().toUpperCase()
        if (!roll) continue
        parts.push(`${roll}=${v}`)
      }
    }
  }
  return simpleHash(parts.join('\n'))
}

function simpleHash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function engSessionId(classKey: ClassKey): string {
  return `eng-${classKey}`
}

export function sessionFromCurrent(
  classKey: ClassKey,
  current: EngCurrent,
  now: string,
  existing?: Session,
): Session {
  return {
    sessionId: existing?.sessionId?.startsWith('eng-') ? existing.sessionId : engSessionId(classKey),
    classKey,
    date1: current.date1,
    topic1: current.topic1,
    date2: current.date2,
    topic2: current.topic2,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export type ParsedEngTab = {
  classKey: ClassKey
  students: Student[]
  current: EngCurrent
  ticks: EngTickColumn[]
  marks: Mark[]
  hash: string
}

export function parseEngTab(classKey: ClassKey, rows: string[][], now: string): ParsedEngTab {
  const current = parseCurrent(rows)
  const ticks = parseTickColumns(rows, current)
  const students = parseEngRoster(classKey, rows)
  const marks = parseEngMarks(classKey, rows, ticks, students, now)
  const hash = hashEngBlock(rows, current, ticks)
  return { classKey, students, current, ticks, marks, hash }
}
