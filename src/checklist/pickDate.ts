/** v0.42.0 (t5u Q-DATES-A LOCKED): the Dates panel targets ONE slot (Date 1 or Date 2) and changes only that slot.
 *  The pair always stays oldest first (t82u); picking the other slot's date collapses to one date. */
export type Pair = [string, string]
export function retarget(pair: Pair, slot: 0 | 1, iso: string): Pair {
  const single = pair[0] === pair[1]
  const other = single ? pair[0] : pair[slot === 0 ? 1 : 0]
  if (single && slot === 0) return [iso, iso]
  return iso <= other ? [iso, other] : [other, iso]
}
/** Shown before saving when the change would swap the slots. */
export function reorderNote(pair: Pair, slot: 0 | 1, iso: string): string {
  const single = pair[0] === pair[1]
  if (slot === 1 && iso < pair[0]) return 'Date 2 will become Date 1'
  if (slot === 0 && !single && iso > pair[1]) return 'Date 1 will become Date 2'
  return ''
}
