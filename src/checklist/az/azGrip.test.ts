import { describe, expect, it } from 'vitest'
import { snapLeft, GRIP_HIT_PX } from './azGrip'

// v0.46.0-beta.4 (Steve t19u, Q-AZ-1 = B): drag the grip sideways; the strip snaps to the nearest edge.
describe('A–Z grip snap', () => {
  it('snaps to the nearest edge of the list area', () => {
    expect(snapLeft(50, 0, 412)).toBe(true)
    expect(snapLeft(300, 0, 412)).toBe(false)
    expect(snapLeft(205, 0, 412)).toBe(true)
    expect(snapLeft(207, 0, 412)).toBe(false)
    expect(snapLeft(600, 400, 412)).toBe(true) // offset container
  })
  it('hit area is at least 44 px (t19u)', () => {
    expect(GRIP_HIT_PX).toBeGreaterThanOrEqual(44)
  })
})
