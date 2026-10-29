/** v0.29 (t170u) — drag-down-to-dismiss decision for bottom sheets. */
export const DISMISS_FRACTION = 0.3
export const FLING_PX_PER_MS = 0.6
export function shouldDismissSheet(dy: number, sheetHeight: number, velocity: number): boolean {
  if (dy <= 0) return false
  if (velocity >= FLING_PX_PER_MS && dy > 24) return true
  return dy >= sheetHeight * DISMISS_FRACTION
}
/** Rubber-band upward pulls; follow finger downward 1:1. */
export function sheetOffset(dy: number): number {
  return dy >= 0 ? dy : -Math.min(12, Math.sqrt(-dy) * 1.5)
}
