import { describe, expect, it } from 'vitest'
import {
  PAINT_COMMIT_PX,
  PAINT_LOCK_PX,
  oppositeSlot,
  paintPhaseFromDelta,
  paintShouldCommit,
} from './paintGesture'

describe('paintGesture', () => {
  it('abandons when mostly vertical', () => {
    expect(paintPhaseFromDelta({ dx: 4, dy: PAINT_LOCK_PX + 2 }, false)).toBe('abandon')
    expect(paintPhaseFromDelta({ dx: 8, dy: 12 }, false)).toBe('abandon')
  })

  it('locks when mostly horizontal past lock px', () => {
    expect(paintPhaseFromDelta({ dx: PAINT_LOCK_PX + 1, dy: 4 }, false)).toBe('locked')
    expect(paintPhaseFromDelta({ dx: -15, dy: 5 }, false)).toBe('locked')
  })

  it('stays tracking under lock threshold', () => {
    expect(paintPhaseFromDelta({ dx: 5, dy: 4 }, false)).toBe('tracking')
  })

  it('commits toward opposite ✓', () => {
    expect(paintShouldCommit('d1', PAINT_COMMIT_PX + 1)).toBe(true)
    expect(paintShouldCommit('d1', PAINT_COMMIT_PX)).toBe(false)
    expect(paintShouldCommit('d2', -(PAINT_COMMIT_PX + 1))).toBe(true)
    expect(paintShouldCommit('d2', -PAINT_COMMIT_PX)).toBe(false)
    expect(oppositeSlot('d1')).toBe('d2')
    expect(oppositeSlot('d2')).toBe('d1')
  })
})
