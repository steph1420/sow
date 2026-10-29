import { describe, expect, it } from 'vitest'
import { extendTarget, rollsBetween } from './paintPhysics'
const rows = [1, 2, 3, 4].map((roll, i) => ({ roll, top: 100 + i * 75, bottom: 100 + i * 75 + 67 }))
// row2: 175–242, row3: 250–317
describe('t170u multi-row swipe hesitancy', () => {
  it('small drift past start row does not extend', () => {
    expect(extendTarget(260, rows, 2, false)).toEqual({ roll: null, armed: false })
    expect(extendTarget(280, rows, 2, false).roll).toBeNull() // 38px beyond but only 45% in
  })
  it('extends after ≥28px AND ≥60% into next row', () => {
    expect(extendTarget(292, rows, 2, false)).toEqual({ roll: 3, armed: true })
  })
  it('upward mirrors', () => {
    expect(extendTarget(150, rows, 2, false).roll).toBeNull()
    expect(extendTarget(125, rows, 2, false)).toEqual({ roll: 1, armed: true })
  })
  it('hysteresis: once armed, plain hit-test (coming back home works)', () => {
    expect(extendTarget(200, rows, 2, true)).toEqual({ roll: 2, armed: true })
    expect(extendTarget(330, rows, 2, true)).toEqual({ roll: 4, armed: true })
  })
  it('rollsBetween fills skipped rows', () => {
    expect(rollsBetween([1, 2, 3, 4], 1, 4)).toEqual([1, 2, 3, 4])
    expect(rollsBetween([1, 2, 3, 4], 3, 2)).toEqual([2, 3])
  })
})
