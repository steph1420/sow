/** v0.41.0 (t103u/t108u v4) — pure date-dial maths: Year dropdown + Month / Date dials; Day follows the date. */
export type Ymd = { y: number; m: number; d: number }
export type DialId = 'month' | 'date'

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()
export const fromIso = (iso: string): Ymd => { const [y, m, d] = iso.split('-').map(Number); return { y: y!, m: m!, d: d! } }
export const toIso = (v: Ymd) => `${v.y}-${String(v.m).padStart(2, '0')}-${String(v.d).padStart(2, '0')}`
export const weekdayShort = (v: Ymd) => WD[new Date(Date.UTC(v.y, v.m - 1, v.d)).getUTCDay()]!
export const wrap = (n: number, size: number) => ((((n - 1) % size) + size) % size) + 1

export function turn(v: Ymd, dial: DialId, delta: number): Ymd {
  if (dial === 'date') return { ...v, d: wrap(v.d + delta, daysInMonth(v.y, v.m)) }
  // v0.43.0 Year-bug fix: Dec ↔ Jan carries the year (was: wrapped and kept the old year → 2025 beside a 2026 date).
  const t = v.y * 12 + (v.m - 1) + delta
  const y = Math.floor(t / 12), m = (t - y * 12) + 1
  return { y, m, d: Math.min(v.d, daysInMonth(y, m)) }
}
export function setYear(v: Ymd, y: number): Ymd { return { y, m: v.m, d: Math.min(v.d, daysInMonth(y, v.m)) } }

/** Year dropdown: from one year before the oldest session (or this year) to one after the newest. */
export function yearOptions(current: number, sessionIsos: string[]): number[] {
  const ys = [current, ...sessionIsos.map((s) => Number(s.slice(0, 4))).filter((n) => n > 1900)]
  const lo = Math.min(...ys) - 1, hi = Math.max(...ys) + 1
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
}

/** v0.44.1: keyboard follows the spinbutton / iOS-wheel convention used by drag + wheel: up = later. */
export function keyStep(key: string): number {
  return key === 'ArrowUp' ? 1 : key === 'ArrowDown' ? -1 : key === 'PageUp' ? 7 : key === 'PageDown' ? -7 : 0
}
/** v0.44.1: a pointer that barely moved and turned no steps is a tap → select row k (0 = centre). */
export const TAP_SLOP = 8
export function tapStep(movedPx: number, steps: number, k: number): number {
  return steps === 0 && Math.abs(movedPx) < TAP_SLOP ? k : 0
}
