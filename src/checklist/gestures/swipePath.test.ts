import { describe, expect, it } from 'vitest'
import { cellAt, isCancelled, pathKeys, stepPath, type PathCell } from './swipePath'

// v0.46.0 (Steve t5u): highlight boxes as the finger passes; lift ticks only highlighted; going back un-highlights; back at start cancels.
const order = [1, 2, 3, 4, 5]
const c = (roll: number, col: number): PathCell => ({ roll, col })
describe('swipe path', () => {
  it('adds cells as the finger passes them', () => {
    let p = [c(1, 0)]
    p = stepPath(p, c(1, 1), order)
    expect(pathKeys(p)).toEqual(['1|0', '1|1'])
  })
  it('a name swipe starts with an empty path; the first crossed box starts it', () => {
    expect(pathKeys(stepPath([], c(3, 0), order))).toEqual(['3|0'])
  })
  it('a fast move fills the skipped rows in the new column', () => {
    expect(pathKeys(stepPath([c(1, 0)], c(4, 0), order))).toEqual(['1|0', '2|0', '3|0', '4|0'])
  })
  it('moving back un-highlights everything after the cell returned to', () => {
    let p = [c(1, 0)]
    for (const x of [c(2, 0), c(3, 0), c(4, 0)]) p = stepPath(p, x, order)
    p = stepPath(p, c(2, 0), order)
    expect(pathKeys(p)).toEqual(['1|0', '2|0'])
    p = stepPath(p, c(1, 0), order)
    expect(pathKeys(p)).toEqual(['1|0'])
  })
  it('the same cell again changes nothing', () => {
    const p = [c(1, 0), c(1, 1)]
    expect(stepPath(p, c(1, 1), order)).toBe(p)
  })
  it('cancelled when back on the start cell at/behind where the finger started', () => {
    expect(isCancelled([c(1, 0)], 4, 1)).toBe(true) // back within slop
    expect(isCancelled([c(1, 0)], -30, 1)).toBe(true) // went past the start, behind it
    expect(isCancelled([c(1, 0)], 40, 1)).toBe(false) // one-date swipe across its own box
    expect(isCancelled([c(1, 0), c(1, 1)], 2, 1)).toBe(false)
    expect(isCancelled([], 40, 1)).toBe(true) // name swipe that crossed nothing
  })
  it('hit-tests a cell with slop; gaps between boxes are no cell', () => {
    const rows = [{ roll: 1, top: 0, bottom: 50 }, { roll: 2, top: 50, bottom: 100 }]
    const cols = [{ left: 300, right: 344 }, { left: 356, right: 400 }]
    expect(cellAt(320, 25, rows, cols)).toEqual(c(1, 0))
    expect(cellAt(380, 75, rows, cols)).toEqual(c(2, 1))
    expect(cellAt(350, 25, rows, cols)).toBeNull()
    expect(cellAt(100, 25, rows, cols)).toBeNull()
  })
})
