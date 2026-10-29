import { describe, expect, it } from 'vitest'
import {
  oppositeCol,
  paintRoll,
  rollAtY,
  shouldEngagePaint,
  startPaintSession,
} from './paintPhysics'

describe('paintPhysics', () => {
  it('oppositeCol swaps 0↔1', () => {
    expect(oppositeCol(0)).toBe(1)
    expect(oppositeCol(1)).toBe(0)
  })

  it('engages on mostly-horizontal, rejects vertical scroll', () => {
    expect(shouldEngagePaint({ dx: 20, dy: 4 })).toBe(true)
    expect(shouldEngagePaint({ dx: -18, dy: 5 })).toBe(true)
    expect(shouldEngagePaint({ dx: 4, dy: 24 })).toBe(false)
    expect(shouldEngagePaint({ dx: 8, dy: 2 })).toBe(false) // under minDx
  })

  it('session paints opposite col and tracks rolls', () => {
    const s = startPaintSession(0, true, 3)
    expect(s.targetCol).toBe(1)
    expect(s.paintValue).toBe(true)
    expect(paintRoll(s, 4)).toBe(true)
    expect(paintRoll(s, 4)).toBe(false)
    expect([...s.paintedRolls].sort((a, b) => a - b)).toEqual([3, 4])
  })

  it('rollAtY with slop', () => {
    const rows = [
      { roll: 1, top: 100, bottom: 148 },
      { roll: 2, top: 156, bottom: 204 },
    ]
    expect(rollAtY(120, rows)).toBe(1)
    expect(rollAtY(152, rows)).toBe(1) // slop into gap toward 1
    expect(rollAtY(210, rows)).toBe(2)
    expect(rollAtY(300, rows)).toBe(null)
  })
})

import { rowSwipeValue } from './paintPhysics'
describe('t165u row swipe value', () => {
  it('ticks unless the start row is fully ticked', () => {
    expect(rowSwipeValue([false, false])).toBe(true)
    expect(rowSwipeValue([true, false])).toBe(true)
    expect(rowSwipeValue([true, true])).toBe(false)
    expect(rowSwipeValue([true])).toBe(false)
  })
})
