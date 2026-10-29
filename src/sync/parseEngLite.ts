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

export type CurrentEntry = { date: string; topic: string }

export function findCurrentCol(rows: string[][]): number {
  const header = rows[0] ?? []
  for (let c = 0; c < header.length; c++) {
    if (/current/i.test(String(header[c] ?? ''))) return c
  }
  return 5
}

/**
 * Current block, ordered. Live layout: `Date` label under Current, then dates
 * down the column (may overlap roster rows). Collapsed layout: `Current Date 30/9` in header.
 */
export function parseCurrentEntries(rows: string[][]): CurrentEntry[] {
  const col = findCurrentCol(rows)
  const header = rows[0] ?? []
  const out: CurrentEntry[] = []
  const headerDate = extractDate(header[col] ?? '')
  if (headerDate) {
    out.push({
      date: headerDate,
      topic: String(header[col + 1] ?? '').replace(/^\s*topic\s*/i, '').trim(),
    })
  }
  let r = 1
  // `Date` label must sit above the roster — lower blocks (e.g. "Completed / Date") are history.
  const rosterStart = findRosterStart(rows)
  const labelLimit = rosterStart < 0 ? Math.min(rows.length, 8) : rosterStart
  for (let i = 1; i < labelLimit; i++) {
    if (/^\s*date\s*$/i.test(String(rows[i]?.[col] ?? ''))) {
      r = i + 1
      break
    }
  }
  for (; r < rows.length; r++) {
    const d = extractDate(rows[r]?.[col] ?? '')
    if (!d) break
    if (out.some((e) => e.date === d)) continue
    out.push({ date: d, topic: String(rows[r]?.[col + 1] ?? '').trim() })
  }
  return out
}

export function parseCurrentLite(rows: string[][]): LiteEngCurrent {
  const e = parseCurrentEntries(rows)
  return {
    date1: e[0]?.date ?? '',
    topic1: e[0]?.topic ?? '',
    date2: e[1]?.date ?? '',
    topic2: e[1]?.topic ?? '',
  }
}

/** Normalize sheet date d/m → ISO (YYYY-MM-DD). */
export function sheetDateToIso(dmy: string, year = 2026): string {
  const m = dmy.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!m) return dmy
  const day = m[1]!.padStart(2, '0')
  const mon = m[2]!.padStart(2, '0')
  return `${year}-${mon}-${day}`
}

/** v0.29.2 Q-FIX-6 (t3u): academic year that `nowIso` falls in (start month 1–12, default April). */
export function academicYearFor(nowIso: string, startMonth = 4): number {
  const y = Number.parseInt(nowIso.slice(0, 4), 10) || 2026
  const mo = Number.parseInt(nowIso.slice(5, 7), 10) || 1
  return mo >= startMonth ? y : y - 1
}

/** d/m (no year) → ISO inside the current academic year: months ≥ start → start year, else the next. */
export function sheetDateToIsoAcademic(dmy: string, nowIso: string, startMonth = 4): string {
  const m = dmy.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!m) return dmy
  const ay = academicYearFor(nowIso, startMonth)
  const mon = Number.parseInt(m[2]!, 10)
  return sheetDateToIso(dmy, mon >= startMonth ? ay : ay + 1)
}

export type TickCol = { col: number; date: string; topic: string; source: 'row2' | 'current' }

export function parseEngTabLite(
  classKey: ClassKey,
  rows: string[][],
  nowIso: string,
  opts: { yearStartMonth?: number } = {},
): {
  students: Student[]
  marks: Mark[]
  current: LiteEngCurrent
  entries: CurrentEntry[]
  tickCols: TickCol[]
  warnings: string[]
  /** P2-4: sheet-layout info that needs no action from the app (e.g. undated tick column). */
  notes: string[]
} {
  const startMonth = opts.yearStartMonth ?? 4
  const entries = parseCurrentEntries(rows)
  const current = parseCurrentLite(rows)
  const start = findRosterStart(rows)
  const students: Student[] = []
  const marks: Mark[] = []
  const warnings: string[] = []
  const notes: string[] = []
  const tickCols: TickCol[] = []
  if (start < 0) return { students, marks, current, entries, tickCols, warnings, notes }

  const header = rows[0] ?? []
  const currentCol = findCurrentCol(rows)

  // Tick col = has ≥1 TRUE/FALSE on roster rows (spacer E never qualifies).
  const candidates: number[] = []
  for (let col = 2; col < currentCol; col++) {
    let hit = false
    for (let r = start; r < rows.length && !hit; r++) {
      if (parseBoolCell(rows[r]?.[col] ?? '') != null) hit = true
    }
    if (hit) candidates.push(col)
  }

  const topicFor = (d: string, col: number) =>
    entries.find((e) => e.date === d)?.topic ||
    String(header[col] ?? '')
      .replace(DATE_RE, '')
      .replace(/date\s*\/\s*topic/i, '')
      .trim()

  // Fallback first: explicit row2/header dates.
  const used = new Set<string>()
  const pending: number[] = []
  for (const col of candidates) {
    const d = extractDate(rows[1]?.[col] ?? '') || extractDate(header[col] ?? '')
    if (d) {
      tickCols.push({ col, date: d, topic: topicFor(d, col), source: 'row2' })
      used.add(d)
    } else pending.push(col)
  }
  // Primary live rule: remaining Current dates → remaining tick cols, by ordinal.
  const free = entries.filter((e) => !used.has(e.date))
  pending.forEach((col, i) => {
    const e = free[i]
    if (!e) {
      notes.push(
        `col ${String.fromCharCode(65 + col)} has ticks but no date under Current · not imported. Add a second Current date on the sheet to bring them in.`,
      )
      return
    }
    tickCols.push({ col, date: e.date, topic: e.topic || topicFor(e.date, col), source: 'current' })
  })
  if (free.length > pending.length) {
    warnings.push(`${free.length - pending.length} Current date(s) without a tick column`)
  }
  tickCols.sort((a, b) => a.col - b.col)

  for (let r = start; r < rows.length; r++) {
    const roll = Number.parseInt(String(rows[r]?.[0] ?? '').trim(), 10)
    const name = String(rows[r]?.[1] ?? '').trim()
    if (!Number.isFinite(roll) || roll <= 0 || !name) continue
    students.push({ id: studentId(classKey, roll), classKey, roll, name })
    for (const t of tickCols) {
      const b = parseBoolCell(rows[r]?.[t.col] ?? '')
      if (b == null) continue
      const date = sheetDateToIsoAcademic(t.date, nowIso, startMonth)
      marks.push({
        markId: markId(classKey, roll, date),
        classKey,
        roll,
        name,
        date,
        topic: t.topic,
        set: b,
        submitted: false,
        updatedAt: nowIso,
      })
    }
  }

  return { students, marks, current, entries, tickCols, warnings, notes }
}
