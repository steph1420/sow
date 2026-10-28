/**
 * Lite Eng tab parse — rewritten from Sync A ideas (not a port of sow-pwa UI).
 * Roster = roll+name rows; ticks = TRUE/FALSE columns before Current.
 */
import type { ClassKey, Mark, Student } from '../data/types'
import { markId, studentId } from '../data/types'

const DATE_RE = /\b(\d{1,2}\/\d{1,2})\b/

export function extractDate(text: string): string {
  const m = String(text ?? '').trim().match(DATE_RE)
  return m?.[1] ?? ''
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

export type LiteEngCurrent = { date1: string; topic1: string; date2: string; topic2: string }

export function parseCurrentLite(rows: string[][]): LiteEngCurrent {
  const header = rows[0] ?? []
  let currentCol = 5
  for (let c = 0; c < header.length; c++) {
    if (/current/i.test(String(header[c] ?? ''))) {
      currentCol = c
      break
    }
  }
  const topicCol = currentCol + 1
  return {
    date1: extractDate(rows[2]?.[currentCol] ?? '') || extractDate(header[currentCol] ?? ''),
    topic1: String(rows[2]?.[topicCol] ?? '').trim(),
    date2: extractDate(rows[3]?.[currentCol] ?? ''),
    topic2: String(rows[3]?.[topicCol] ?? '').trim(),
  }
}

/** Normalize sheet date d/m → ISO-ish storage used by demo (YYYY-MM-DD) when possible. */
export function sheetDateToIso(dmy: string, year = 2026): string {
  const m = dmy.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!m) return dmy
  const day = m[1]!.padStart(2, '0')
  const mon = m[2]!.padStart(2, '0')
  return `${year}-${mon}-${day}`
}

export function parseEngTabLite(
  classKey: ClassKey,
  rows: string[][],
  nowIso: string,
): { students: Student[]; marks: Mark[]; current: LiteEngCurrent } {
  const current = parseCurrentLite(rows)
  const start = findRosterStart(rows)
  const students: Student[] = []
  const marks: Mark[] = []
  if (start < 0) return { students, marks, current }

  const header = rows[0] ?? []
  let currentCol = 5
  for (let c = 0; c < header.length; c++) {
    if (/current/i.test(String(header[c] ?? ''))) {
      currentCol = c
      break
    }
  }

  // Tick columns C..before Current; date from row2 or header
  const tickCols: { col: number; date: string; topic: string }[] = []
  for (let col = 2; col < currentCol; col++) {
    const date = extractDate(rows[1]?.[col] ?? '') || extractDate(header[col] ?? '')
    if (!date) continue
    tickCols.push({
      col,
      date: sheetDateToIso(date),
      topic: String(header[col] ?? '').replace(DATE_RE, '').trim(),
    })
  }
  // Ensure Current dates exist as tick targets
  if (current.date1 && !tickCols.some((t) => t.date === sheetDateToIso(current.date1))) {
    tickCols.push({ col: -1, date: sheetDateToIso(current.date1), topic: current.topic1 })
  }

  for (let r = start; r < rows.length; r++) {
    const roll = Number.parseInt(String(rows[r]?.[0] ?? '').trim(), 10)
    const name = String(rows[r]?.[1] ?? '').trim()
    if (!Number.isFinite(roll) || roll <= 0 || !name) continue
    students.push({ id: studentId(classKey, roll), classKey, roll, name })

    for (const t of tickCols) {
      let set = false
      if (t.col >= 0) {
        const b = parseBoolCell(rows[r]?.[t.col] ?? '')
        if (b == null) continue
        set = b
      } else {
        // Current-only date with no tick col — skip mark seed
        continue
      }
      marks.push({
        markId: markId(classKey, roll, t.date),
        classKey,
        roll,
        name,
        date: t.date,
        topic: t.topic,
        set,
        submitted: false,
        updatedAt: nowIso,
      })
    }
  }

  return { students, marks, current }
}
