/**
 * Hold-paint physics — fresh contracts (not ported useHoldPaint).
 *
 * Lock (Steve + Phase B brief):
 * - No hold delay — engage on mostly-horizontal continuous stroke
 * - Start on either ✓ column; paint the opposite column
 * - Vertical without horizontal intent = scroll (caller ignores)
 * - Soft green trail is a view concern; this module is pure geometry/state
 */

export type DateCol = 0 | 1

export type PaintEngageInput = {
  dx: number
  dy: number
  /** Min |dx| to count as a stroke (px) */
  minDx?: number
  /** |dx| must exceed |dy| * ratio (default 1.15) */
  horizRatio?: number
}

export type PaintSession = {
  startCol: DateCol
  targetCol: DateCol
  /** Value brushed onto target from the start cell */
  paintValue: boolean
  paintedRolls: Set<number>
}

/** Opposite column of a 2-date pair. */
export function oppositeCol(col: DateCol): DateCol {
  return col === 0 ? 1 : 0
}

/**
 * Engage paint when the stroke is mostly horizontal.
 * Returns false for vertical-dominant motion (scroll wins).
 */
export function shouldEngagePaint(input: PaintEngageInput): boolean {
  const minDx = input.minDx ?? 10
  const ratio = input.horizRatio ?? 1.15
  const ax = Math.abs(input.dx)
  const ay = Math.abs(input.dy)
  if (ax < minDx) return false
  return ax >= ay * ratio
}

export function startPaintSession(
  startCol: DateCol,
  paintValue: boolean,
  startRoll: number,
): PaintSession {
  return {
    startCol,
    targetCol: oppositeCol(startCol),
    paintValue,
    paintedRolls: new Set([startRoll]),
  }
}

/** Add a roll crossed by the stroke; returns whether it was newly added. */
export function paintRoll(session: PaintSession, roll: number): boolean {
  if (session.paintedRolls.has(roll)) return false
  session.paintedRolls.add(roll)
  return true
}

/**
 * Hit-test: which roster roll is under clientY, given row rects.
 * Forgiving: expands each row by slopY (default 6).
 */
export function rollAtY(
  clientY: number,
  rows: { roll: number; top: number; bottom: number }[],
  slopY = 6,
): number | null {
  for (const r of rows) {
    if (clientY >= r.top - slopY && clientY <= r.bottom + slopY) return r.roll
  }
  return null
}

/**
 * t165u Wave A — a horizontal swipe sets BOTH visible dates for every covered row.
 * Value = toggle of the first row: fully ticked → clear, otherwise → tick.
 */
export function rowSwipeValue(startRowOn: boolean[]): boolean {
  return !(startRowOn.length > 0 && startRowOn.every(Boolean))
}
