// v0.31.0 (Steve t5u): swipe recognised from ~half the name row; boxes respond only when crossed.
import { describe, expect, it } from 'vitest'
import { NAME_SWIPE_OPTIONS, crossedColumns, nameArmed, normalizeNameSwipe } from './nameSwipe'
import { PREFS_DEFAULTS } from '../../prefs/appPrefs'

describe('name-row swipe arming', () => {
  it('default arms from 50% of the name row', () => {
    expect(PREFS_DEFAULTS['gestures.nameSwipeFrom']).toBe(0.5)
    expect(nameArmed(160, 100, 200, 0.5)).toBe(false) // 30% in
    expect(nameArmed(200, 100, 200, 0.5)).toBe(true) // exactly half
    expect(nameArmed(290, 100, 200, 0.5)).toBe(true)
  })
  it('Off never arms; options are Off/30/50/70%', () => {
    expect(nameArmed(299, 100, 200, 0)).toBe(false)
    expect(NAME_SWIPE_OPTIONS.map((o) => o.value)).toEqual([0, 0.3, 0.5, 0.7])
    expect(normalizeNameSwipe(9)).toBe(0.5)
    expect(normalizeNameSwipe(0)).toBe(0)
  })
})

describe('crossing', () => {
  const cols = [{ left: 300, right: 344 }, { left: 344, right: 388 }]
  it('no box crossed while the finger stays in the name area', () => {
    expect(crossedColumns(200, 290, cols)).toEqual([])
  })
  it('entering a box counts; a fast jump over a box counts too', () => {
    expect(crossedColumns(290, 310, cols)).toEqual([0])
    expect(crossedColumns(250, 400, cols)).toEqual([0, 1])
    expect(crossedColumns(400, 350, cols)).toEqual([1]) // leftward back into col 1
  })
})
