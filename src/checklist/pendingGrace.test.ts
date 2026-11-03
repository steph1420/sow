import { describe, expect, it } from 'vitest'
import { startGrace, cancelGrace, expiredRolls, graceFraction, inGrace } from './pendingGrace'

describe('pending grace (t116u/t118u)', () => {
  it('a ticked row stays until its deadline, then expires', () => {
    let g = startGrace(new Map(), 7, 1000, 3000)
    expect(inGrace(g, 7)).toBe(true)
    expect(expiredRolls(g, 3999)).toEqual([])
    expect(expiredRolls(g, 4000)).toEqual([7])
    g = startGrace(g, 9, 2000, 3000)
    expect(expiredRolls(g, 4500)).toEqual([7])
  })
  it('tapping again cancels', () => {
    const g = cancelGrace(startGrace(new Map(), 7, 0, 3000), 7)
    expect(inGrace(g, 7)).toBe(false)
  })
  it('bar drains 1 → 0', () => {
    const g = startGrace(new Map(), 1, 0, 3000)
    expect(graceFraction(g, 1, 0)).toBe(1)
    expect(graceFraction(g, 1, 1500)).toBeCloseTo(0.5)
    expect(graceFraction(g, 1, 5000)).toBe(0)
  })
  it('grace 0 means no grace', () => {
    expect(inGrace(startGrace(new Map(), 1, 0, 0), 1)).toBe(false)
  })
})
