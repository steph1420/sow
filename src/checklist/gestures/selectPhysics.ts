/**
 * Select-mode physics — fresh contracts.
 *
 * - Name-hold ~800ms enters select with that roll selected
 * - 0 selected = none (actions no-op)
 * - Roll-drag selects inclusive range from anchor
 * - Tap name toggles membership
 */

export const SELECT_HOLD_MS = 800

export type SelectModel = {
  active: boolean
  selected: Set<number>
  /** Anchor for roll-drag range */
  dragAnchor: number | null
}

export function createSelectModel(): SelectModel {
  return { active: false, selected: new Set(), dragAnchor: null }
}

export function enterSelect(_model: SelectModel, roll: number): SelectModel {
  return {
    active: true,
    selected: new Set([roll]),
    dragAnchor: roll,
  }
}

export function exitSelect(): SelectModel {
  return createSelectModel()
}

export function toggleRoll(model: SelectModel, roll: number): SelectModel {
  if (!model.active) return model
  const next = new Set(model.selected)
  if (next.has(roll)) next.delete(roll)
  else next.add(roll)
  return { ...model, selected: next, dragAnchor: roll }
}

/** Inclusive range select from anchor → roll (sorted by roll order list). */
export function applyRollDrag(
  model: SelectModel,
  orderedRolls: number[],
  roll: number,
): SelectModel {
  if (!model.active || model.dragAnchor == null) return model
  const a = orderedRolls.indexOf(model.dragAnchor)
  const b = orderedRolls.indexOf(roll)
  if (a < 0 || b < 0) return model
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const next = new Set(model.selected)
  for (let i = lo; i <= hi; i++) next.add(orderedRolls[i]!)
  return { ...model, selected: next }
}


/** Actions enabled only when ≥1 selected (0 = none). */
export function actionsEnabled(model: SelectModel): boolean {
  return model.active && model.selected.size > 0
}

/**
 * Has the pointer been held long enough (and not moved past slop)
 * to enter select?
 */
export function shouldEnterSelect(heldMs: number, movePx: number, slop = 10): boolean {
  return heldMs >= SELECT_HOLD_MS && movePx <= slop
}
