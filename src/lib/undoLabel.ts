import type { UndoEntry } from './undoStack'
/** v0.41.0 (t101u): toast text naming what Undo / Redo just did. Pure. */
export type UndoCtx = { name: (roll: number) => string; dayNum: (iso: string) => string; rosterSize: number }
export function describeUndo(e: UndoEntry, kind: 'undo' | 'redo', c: UndoCtx): string {
  const verb = kind === 'undo' ? 'Undid' : 'Redid'
  const pairs = e.redo.map((after, i) => ({ after, before: e.undo[i]! }))
  const field = pairs.some((p) => p.before && p.before.submitted !== p.after.submitted) && !pairs.some((p) => p.before && p.before.set !== p.after.set) ? 'submitted' : 'set'
  const on = pairs.filter((p) => p.after[field]).length >= pairs.length / 2
  const what = field === 'set' ? (on ? 'tick' : 'untick') : on ? 'submitted' : 'unsubmitted'
  const rolls = [...new Set(pairs.map((p) => p.after.roll))]
  const dates = [...new Set(pairs.map((p) => p.after.date))].sort()
  const dn = dates.map(c.dayNum).join(' + ')
  if (rolls.length === 1) return `${verb} ${what} · ${c.name(rolls[0]!)} · ${dn}`
  if (dates.length === 1 && rolls.length >= c.rosterSize && field === 'set') return `${verb} ${what} all · ${dn} · ${rolls.length} pupils`
  const n = pairs.length
  return `${verb} ${n} ${what === 'tick' ? 'ticks' : what === 'untick' ? 'unticks' : what} · ${dn}`
}
