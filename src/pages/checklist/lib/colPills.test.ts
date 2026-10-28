import { describe, expect, it } from 'vitest'
import { showTwoCol, singlePillSlot, toggleColPill } from './colPills'

describe('colPills', () => {
  it('toggles a pill on/off', () => {
    expect(toggleColPill({ d1: true, d2: true }, 'd2')).toEqual({ d1: true, d2: false })
    expect(toggleColPill({ d1: true, d2: false }, 'd2')).toEqual({ d1: true, d2: true })
  })

  it('force ≥1 — refuses to turn off the last pill', () => {
    expect(toggleColPill({ d1: true, d2: false }, 'd1')).toEqual({ d1: true, d2: false })
    expect(toggleColPill({ d1: false, d2: true }, 'd2')).toEqual({ d1: false, d2: true })
  })

  it('showTwoCol only when both dates + both pills', () => {
    expect(showTwoCol(true, { d1: true, d2: true })).toBe(true)
    expect(showTwoCol(true, { d1: true, d2: false })).toBe(false)
    expect(showTwoCol(false, { d1: true, d2: true })).toBe(false)
  })

  it('singlePillSlot picks the on pill in 1-col', () => {
    expect(singlePillSlot(true, { d1: true, d2: true })).toBeNull()
    expect(singlePillSlot(true, { d1: true, d2: false })).toBe('d1')
    expect(singlePillSlot(true, { d1: false, d2: true })).toBe('d2')
    expect(singlePillSlot(false, { d1: true, d2: false })).toBeNull()
  })
})
