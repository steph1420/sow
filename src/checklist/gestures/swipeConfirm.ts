/**
 * v0.30.0 (Steve t175u) — swipe-confirm styles, selectable in Developer options.
 * Plan + mocks: SWIPE_CONFIRM_PLAN.md, swipe-confirm-mj*.png. Blue stays the default until Steve picks.
 */
export type SwipeConfirmStyle = 'blue' | 'tint' | 'ghost' | 'sliver' | 'wash' | 'ghostTint'

export const SWIPE_CONFIRM_STYLES: { id: SwipeConfirmStyle; label: string }[] = [
  { id: 'blue', label: 'Blue ring' },
  { id: 'tint', label: 'A · Soft tint' },
  { id: 'ghost', label: 'B · Ghost ✓' },
  { id: 'sliver', label: 'C · Edge sliver' },
  { id: 'wash', label: 'D · Trailing wash (default)' },
  { id: 'ghostTint', label: 'B+A · Ghost ✓ + tint' },
]

export function normalizeSwipeStyle(v: unknown): SwipeConfirmStyle {
  return SWIPE_CONFIRM_STYLES.some((s) => s.id === v) ? (v as SwipeConfirmStyle) : 'wash'
}

export type PendingFlags = { ring: boolean; tint: boolean; ghost: boolean; sliver: boolean; wash: boolean }

/** Which cues a covered row shows. B+A: ghost ✓ always; the ~7% tint only once ≥2 rows are covered. */
export function pendingFlags(style: SwipeConfirmStyle, spanCount: number): PendingFlags {
  return {
    ring: style === 'blue',
    tint: style === 'tint' || (style === 'ghostTint' && spanCount >= 2),
    ghost: style === 'ghost' || style === 'ghostTint',
    sliver: style === 'sliver',
    wash: style === 'wash',
  }
}

/** Class suffix for a covered row. `paintValue` false = the swipe will clear (ghost shows fading ticks). */
export function pendingRowClass(style: SwipeConfirmStyle, spanCount: number, paintValue: boolean): string {
  const f = pendingFlags(style, spanCount)
  if (f.ring) return ' paint-glow'
  let c = ' pc'
  if (f.tint) c += ' pc-tint'
  if (f.ghost) c += ' pc-ghost'
  if (f.sliver) c += ' pc-sliver'
  if (f.wash) c += ' pc-wash'
  if (!paintValue) c += ' pc-clear'
  return c
}

/** D: finger position across the row, 0–100 (%). */
export function washPercent(clientX: number, rowLeft: number, rowWidth: number): number {
  if (rowWidth <= 0) return 0
  return Math.round(Math.min(100, Math.max(0, ((clientX - rowLeft) / rowWidth) * 100)))
}

/** v0.46.0-beta.4 (t23u): the wash trails behind the finger in the direction it is moving. */
export type WashDir = 'ltr' | 'rtl'
/** Pixels of sideways travel before the wash flips direction (stops jitter flicker). */
export const WASH_DIR_MIN_PX = 2
export function washDir(prev: WashDir, prevX: number, x: number): WashDir {
  if (x > prevX + WASH_DIR_MIN_PX) return 'ltr'
  if (x < prevX - WASH_DIR_MIN_PX) return 'rtl'
  return prev
}
/** Wash length in % measured from the edge the swipe came from. */
export function washTrail(clientX: number, rowLeft: number, rowWidth: number, dir: WashDir): number {
  const p = washPercent(clientX, rowLeft, rowWidth)
  return dir === 'rtl' ? 100 - p : p
}
