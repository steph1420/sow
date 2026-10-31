/** v0.42.0 (t5u Q-DATES-A LOCKED): the Dates panel targets ONE slot (Date 1 or Date 2) and changes only that slot.
 *  The pair always stays oldest first (t82u); picking the other slot's date collapses to one date. */
export type Pair = [string, string]
export function retarget(pair: Pair, slot: 0 | 1, iso: string): Pair {
  const single = pair[0] === pair[1]
  const other = single ? pair[0] : pair[slot === 0 ? 1 : 0]
  if (single && slot === 0) return [iso, iso]
  return iso <= other ? [iso, other] : [other, iso]
}
/** v0.44.3 (t55u): self-heal a stored pair — drop deleted/nonexistent dates, keep oldest first. null ⇒ use default. */
export function healPair(pair: readonly string[] | null | undefined, exists: (iso: string) => boolean): Pair | null {
  if (!pair) return null
  const ok = [...new Set(pair.filter((d) => typeof d === 'string' && exists(d)))].sort()
  if (!ok.length) return null
  return [ok[0]!, ok[ok.length - 1]!]
}
/** v0.44.3 (t55u): one column per date — duplicate keys made React leak header columns. */
export function uniqueCols<T extends { date: string }>(cols: T[]): T[] {
  const seen = new Set<string>()
  return cols.filter((c) => (seen.has(c.date) ? false : (seen.add(c.date), true)))
}
