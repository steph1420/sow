/** v0.43.0 — pure helpers for moving / deleting sessions (marks move with the date, Q-V43-3). */
import type { MarksMap } from '../checklist/types'
import type { Pair } from '../checklist/pickDate'

const dateOf = (k: string) => k.slice(k.indexOf('|') + 1)
const rollOf = (k: string) => k.slice(0, k.indexOf('|'))

export function moveMarks(marks: MarksMap, from: string, to: string): MarksMap {
  if (from === to) return marks
  const out: MarksMap = {}
  for (const [k, v] of Object.entries(marks)) out[dateOf(k) === from ? `${rollOf(k)}|${to}` : k] = v
  return out
}
export function countMarks(marks: MarksMap, date: string): number {
  let n = 0
  for (const [k, v] of Object.entries(marks)) if (dateOf(k) === date && (v.set || v.submitted)) n++
  return n
}
export function dropMarks(marks: MarksMap, date: string): { next: MarksMap; removed: MarksMap } {
  const next: MarksMap = {}, removed: MarksMap = {}
  for (const [k, v] of Object.entries(marks)) (dateOf(k) === date ? removed : next)[k] = v
  return { next, removed }
}
/** Topic of the session already on `to` (blocks Save), or null. `from` null = adding. */
export function clashFor(sessions: Map<string, string>, from: string | null, to: string): string | null {
  if (from === to) return null
  return sessions.has(to) ? (sessions.get(to) ?? '') : null
}
const sort = (a: string, b: string): Pair => (a <= b ? [a, b] : [b, a])
export function pairAfterMove(pair: Pair, from: string, to: string): Pair {
  if (pair[0] !== from && pair[1] !== from) return pair
  return sort(pair[0] === from ? to : pair[0], pair[1] === from ? to : pair[1])
}
export function pairAfterDelete(pair: Pair, date: string): Pair | null {
  const rest = pair.filter((d) => d !== date)
  if (!rest.length) return null
  return rest.length === 1 ? [rest[0]!, rest[0]!] : pair
}
export const DATE_COLS_KEY = 'sow.dateCols'
export const readDateCols = (raw: string | null): 1 | 2 => (raw === '1' ? 1 : 2)
