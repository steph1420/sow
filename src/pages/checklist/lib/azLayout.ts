import { AZ_SLOT_COUNT } from '../../../lib/azScrubber'

export const CK_AZ_LETTER_MIN_PX = 11
export const CK_AZ_IDLE_WIDTH_DEFAULT = 42

export type AzSlotLayout = {
  /** Index 0 = ∗, 1..26 = A..Z */
  index: number
  /** CSS top percentage for absolute positioning (slot center). */
  topPct: number
  /** CSS translateY to center the glyph on topPct. */
  translateY: string
}

/**
 * Absolute-% tops for 27 slots — no flex-squish.
 * Each letter sits at (i + 0.5) / N of strip height.
 */
export function azAbsoluteSlotLayouts(slotCount = AZ_SLOT_COUNT): AzSlotLayout[] {
  const n = Math.max(1, slotCount)
  const out: AzSlotLayout[] = []
  for (let i = 0; i < n; i++) {
    const topPct = ((i + 0.5) / n) * 100
    out.push({
      index: i,
      topPct,
      translateY: '-50%',
    })
  }
  return out
}

/** Font size for idle letters — never below floor; scales gently with strip height. */
export function azIdleLetterFontPx(
  stripHeightPx: number,
  slotCount = AZ_SLOT_COUNT,
  floorPx = CK_AZ_LETTER_MIN_PX,
): number {
  if (stripHeightPx <= 0) return floorPx
  const per = stripHeightPx / Math.max(1, slotCount)
  // Leave ~2px padding; never below floor.
  return Math.max(floorPx, Math.min(14, Math.floor(per - 2)))
}

/** CSS top string for a slot (e.g. `1.851%`). */
export function azSlotTopCss(index: number, slotCount = AZ_SLOT_COUNT): string {
  const n = Math.max(1, slotCount)
  const topPct = ((index + 0.5) / n) * 100
  return `${topPct}%`
}
