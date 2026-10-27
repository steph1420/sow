/** Format sheet dates like `28/10` or `30/9` as `Mon 28`. */
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function parseSheetDate(raw: string, now = new Date()): Date | null {
  const m = String(raw ?? '')
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  let year = m[3] ? Number(m[3]) : now.getFullYear()
  if (year < 100) year += 2000
  if (!m[3]) {
    // Prefer the nearest occurrence of that month/day (school year wrap).
    const cand = new Date(year, month - 1, day)
    const prev = new Date(year - 1, month - 1, day)
    const next = new Date(year + 1, month - 1, day)
    const dist = (d: Date) => Math.abs(d.getTime() - now.getTime())
    const best = [cand, prev, next].sort((a, b) => dist(a) - dist(b))[0]
    return best
  }
  const d = new Date(year, month - 1, day)
  return Number.isNaN(d.getTime()) ? null : d
}

export function shortDateLabel(raw: string, now = new Date()): string {
  const d = parseSheetDate(raw, now)
  if (!d) {
    // Fallback: show day number if parseable, else raw.
    const m = String(raw ?? '')
      .trim()
      .match(/^(\d{1,2})\//)
    return m ? m[1] : String(raw ?? '')
  }
  return `${WD[d.getDay()]} ${d.getDate()}`
}

/** Sort key for `dd/mm` strings (year-aware via parseSheetDate). */
export function sheetDateSortKey(raw: string, now = new Date()): number {
  const d = parseSheetDate(raw, now)
  return d ? d.getTime() : 0
}

/** App sheet format: `d/m` (no leading zeros), e.g. `28/10`, `30/9`. */
export function formatSheetDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function sameSheetDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export type MonthCell = { date: Date; inMonth: boolean }

/** Sunday-start 6×7 grid for a month (month is 0-indexed). */
export function buildMonthCells(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1)
  const startPad = first.getDay()
  const start = new Date(year, month, 1 - startPad)
  const cells: MonthCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cells.push({ date: d, inMonth: d.getMonth() === month })
  }
  return cells
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const
