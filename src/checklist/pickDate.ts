import type { DateSlot } from './types'
/** v0.41.0 (t108u): a picked date replaces date 2; the pair stays in calendar order (t82u). */
export function applyPick(dates: [DateSlot, DateSlot] | DateSlot[], picked: DateSlot): [DateSlot, DateSlot] {
  const first = dates[0]!
  if (picked.date === first.date) return [dates[0]!, dates[1] ?? dates[0]!]
  return picked.date < first.date ? [picked, first] : [first, picked]
}
