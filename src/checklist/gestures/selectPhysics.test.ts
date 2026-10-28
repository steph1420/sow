import { describe, expect, it } from 'vitest'
import {
  actionsEnabled,
  applyRollDrag,
  createSelectModel,
  enterSelect,
  exitSelect,
  SELECT_HOLD_MS,
  shouldEnterSelect,
  toggleRoll,
} from './selectPhysics'

describe('selectPhysics', () => {
  it('enter selects one; 0 = none disables actions after clear', () => {
    let m = enterSelect(createSelectModel(), 5)
    expect(actionsEnabled(m)).toBe(true)
    m = toggleRoll(m, 5)
    expect(m.selected.size).toBe(0)
    expect(actionsEnabled(m)).toBe(false)
  })

  it('roll-drag fills inclusive range', () => {
    const rolls = [1, 2, 3, 4, 5]
    let m = enterSelect(createSelectModel(), 2)
    m = applyRollDrag(m, rolls, 4)
    expect([...m.selected].sort((a, b) => a - b)).toEqual([2, 3, 4])
  })

  it('hold timing gate', () => {
    expect(shouldEnterSelect(SELECT_HOLD_MS, 0)).toBe(true)
    expect(shouldEnterSelect(400, 0)).toBe(false)
    expect(shouldEnterSelect(SELECT_HOLD_MS, 20)).toBe(false)
  })

  it('exit clears', () => {
    const m = exitSelect()
    expect(m.active).toBe(false)
    expect(m.selected.size).toBe(0)
  })
})
