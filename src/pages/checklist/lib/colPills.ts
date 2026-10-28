import type { ColPills, DateSlot } from '../types'

/** Force ≥1 pill on — toggling the last-on pill is a no-op. */
export function toggleColPill(prev: ColPills, slot: DateSlot): ColPills {
  const next: ColPills = { ...prev, [slot]: !prev[slot] }
  if (!next.d1 && !next.d2) return prev
  return next
}

/** Both date slots present and both pills on → 2-col layout. */
export function showTwoCol(hasTwoDates: boolean, pills: ColPills): boolean {
  return hasTwoDates && pills.d1 && pills.d2
}

/** When 1-col with two dates, which slot is visible (never null if hasTwoDates). */
export function singlePillSlot(hasTwoDates: boolean, pills: ColPills): DateSlot | null {
  if (!hasTwoDates) return null
  if (pills.d1 && pills.d2) return null
  if (pills.d1) return 'd1'
  if (pills.d2) return 'd2'
  return 'd1' // unreachable if force≥1 held; safe fallback
}
