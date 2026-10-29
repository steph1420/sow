/**
 * v0.31.0 (Steve t5u): "Make the swipe recognised from about half the length of the name row.
 * But checkboxes only respond when I cross over them."
 * Before: only the 44px ✓ cells (`.sw-check-hit`) could start a swipe; the name cell only did long-press.
 */
export const NAME_SWIPE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 0.3, label: 'From 30%' },
  { value: 0.5, label: 'From 50%' },
  { value: 0.7, label: 'From 70%' },
]

export function normalizeNameSwipe(v: unknown): number {
  return NAME_SWIPE_OPTIONS.some((o) => o.value === v) ? (v as number) : 0.5
}

/** A touch on the name cell arms a swipe when it lands at or right of `frac` of the cell (0 = off). */
export function nameArmed(clientX: number, nameLeft: number, nameWidth: number, frac: number): boolean {
  if (!frac || nameWidth <= 0) return false
  return clientX >= nameLeft + nameWidth * frac
}

/** Column indexes whose [left,right] the finger's path from prevX to x passed through (fast jumps included). */
export function crossedColumns(prevX: number, x: number, cols: { left: number; right: number }[]): number[] {
  const lo = Math.min(prevX, x), hi = Math.max(prevX, x)
  const out: number[] = []
  cols.forEach((c, i) => {
    if (hi >= c.left && lo <= c.right) out.push(i)
  })
  return out
}
