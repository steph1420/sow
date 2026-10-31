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
export function healPair(pair: readonly string[] | null | undefined, exists: (iso: string) => boolean, opt?: { two?: boolean; all?: readonly string[] }): Pair | null {
  if (!pair) return null
  const ok = [...new Set(pair.filter((d) => typeof d === 'string' && exists(d)))].sort()
  if (!ok.length) return null
  const p: Pair = [ok[0]!, ok[ok.length - 1]!]
  return opt?.two && opt.all ? fillPair(p, opt.all.filter(exists)) : p
}
/** v0.44.4 (t56u): 2-date mode — a collapsed pair [x,x] takes the nearest other date (latest earlier, else next later). */
export function fillPair(pair: Pair, all: readonly string[]): Pair {
  if (pair[0] !== pair[1]) return pair
  const x = pair[0]
  const ds = [...new Set(all)].sort()
  const earlier = ds.filter((d) => d < x)
  if (earlier.length) return [earlier[earlier.length - 1]!, x]
  const later = ds.find((d) => d > x)
  return later ? [x, later] : pair
}
/** v0.44.4 (t56u): 2-date header pick — picking the other column's date swaps instead of collapsing to one column. */
export function retarget2(pair: Pair, slot: 0 | 1, iso: string, all: readonly string[]): Pair {
  const other = pair[slot === 0 ? 1 : 0]
  if (pair[0] !== pair[1] && iso === other) { const prev = pair[slot]; return (prev <= iso ? [prev, iso] : [iso, prev]) as Pair }
  const other2 = pair[0] === pair[1] ? pair[0] : other
  const n: Pair = iso <= other2 ? [iso, other2] : [other2, iso]
  return fillPair(n, all)
}
/** v0.44.3 (t55u): one column per date — duplicate keys made React leak header columns. */
export function uniqueCols<T extends { date: string }>(cols: T[]): T[] {
  const seen = new Set<string>()
  return cols.filter((c) => (seen.has(c.date) ? false : (seen.add(c.date), true)))
}
