/**
 * v0.46.0 (Steve t5u): "any time marked set is also submitted. Submitted ticks should have two status — one manual and
 * one derived from set status." The stored `submitted` flag is the MANUAL flag (old data: every stored Submitted tick
 * becomes manual, nothing lost). Shown Submitted = manual OR Set.
 */
export type Cell = { set: boolean; submitted: boolean }
export type Field = 'set' | 'submitted'

export const isSubmitted = (m: Partial<Cell> | null | undefined): boolean => !!m && (!!m.submitted || !!m.set)
export const submittedSource = (m: Cell): 'manual' | 'derived' | 'none' => (m.submitted ? 'manual' : m.set ? 'derived' : 'none')
export const fieldValue = (m: Cell, f: Field): boolean => (f === 'set' ? m.set : isSubmitted(m))

/** Tap: Set toggles Set; Submitted toggles the manual flag (tap → manual, tap a manual one → back to derived). */
export function toggleField(m: Cell, f: Field): Cell {
  return f === 'set' ? { set: !m.set, submitted: m.submitted } : { set: m.set, submitted: !m.submitted }
}
/** Paint / tick all: Set mode writes Set; Submitted mode writes the manual flag. */
export function paintField(m: Cell, f: Field, value: boolean): Cell {
  return f === 'set' ? { set: value, submitted: m.submitted } : { set: m.set, submitted: value }
}
