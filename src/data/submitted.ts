/**
 * v0.46.0 (Steve t5u): "any time marked set is also submitted. Submitted ticks should have two status — one manual and
 * one derived from set status." The stored `submitted` flag is the MANUAL flag (old data: every stored Submitted tick
 * becomes manual, nothing lost).
 * v0.46.0-beta.3 (Steve t16u): tapping a derived (auto) Submitted unticks it. That is stored as `subOff` = a manual
 * "off" override that only lives while Set stays on (any Set change clears it). Shown Submitted = manual OR (Set AND NOT subOff).
 */
export type Cell = { set: boolean; submitted: boolean; subOff?: boolean }
export type Field = 'set' | 'submitted'

export const isSubmitted = (m: Partial<Cell> | null | undefined): boolean => !!m && (!!m.submitted || (!!m.set && !m.subOff))
export const submittedSource = (m: Cell): 'manual' | 'derived' | 'off' | 'none' =>
  m.submitted ? 'manual' : m.set ? (m.subOff ? 'off' : 'derived') : 'none'
export const fieldValue = (m: Cell, f: Field): boolean => (f === 'set' ? m.set : isSubmitted(m))
/** True when this tap unticks an auto (derived) Submitted — the UI shows the warning toast with Undo. */
export const isDerivedTap = (m: Cell, f: Field): boolean => f === 'submitted' && submittedSource(m) === 'derived'

/** Set change: the off override is dropped (Submitted follows Set again). */
const withSet = (m: Cell, set: boolean): Cell => ({ set, submitted: m.submitted, subOff: set === m.set ? !!m.subOff : false })

/** Tap: Set toggles Set; Submitted: manual → derived · derived → off override · off/none → manual. */
export function toggleField(m: Cell, f: Field): Cell {
  if (f === 'set') return withSet(m, !m.set)
  const src = submittedSource(m)
  if (src === 'manual') return { set: m.set, submitted: false, subOff: false }
  if (src === 'derived') return { set: m.set, submitted: false, subOff: true }
  return { set: m.set, submitted: true, subOff: false }
}
/** Paint / tick all: Set mode writes Set; Submitted mode writes on (manual) or off (off override when Set is on). */
export function paintField(m: Cell, f: Field, value: boolean): Cell {
  if (f === 'set') return withSet(m, value)
  if (value) return { set: m.set, submitted: isSubmitted(m) && !m.submitted ? false : true, subOff: false }
  return { set: m.set, submitted: false, subOff: m.set }
}
