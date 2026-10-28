/**
 * Hold-paint stroke math (Wave A field lock).
 * Mostly-horizontal lock — vertical abandons so pan-y scroll wins.
 * Commit when drag toward the opposite ✓ clears PAINT_COMMIT_PX.
 * (180ms hold timer was Wave A mock; field revision = mostly-horizontal alone — OPEN in psychology.)
 */

import type { DateSlot } from '../types'

export const PAINT_LOCK_PX = 10
export const PAINT_COMMIT_PX = 22

export type PaintPhase = 'idle' | 'tracking' | 'locked' | 'commit' | 'abandon'

export type PaintDelta = { dx: number; dy: number }

/** Pure: decide paint phase from start→current delta and whether already locked. */
export function paintPhaseFromDelta(
  delta: PaintDelta,
  alreadyLocked: boolean,
): PaintPhase {
  const adx = Math.abs(delta.dx)
  const ady = Math.abs(delta.dy)
  if (!alreadyLocked) {
    if (ady > PAINT_LOCK_PX && ady >= adx) return 'abandon'
    if (adx > PAINT_LOCK_PX && adx > ady) return 'locked'
    return 'tracking'
  }
  // locked: toward opposite is decided by caller using from + dx
  return 'locked'
}

/** Pure: has drag toward opposite ✓ cleared commit distance? */
export function paintShouldCommit(from: DateSlot, dx: number): boolean {
  if (from === 'd1') return dx > PAINT_COMMIT_PX
  return dx < -PAINT_COMMIT_PX
}

export function oppositeSlot(from: DateSlot): DateSlot {
  return from === 'd1' ? 'd2' : 'd1'
}
