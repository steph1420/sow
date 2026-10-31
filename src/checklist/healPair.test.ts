import { describe, expect, it } from 'vitest'
import { healPair, uniqueCols } from './pickDate'
const has = (s: string[]) => (d: string) => s.includes(d)
describe('v0.44.3 t55u: header columns never duplicate, deleted dates drop out', () => {
  it('deleted date in the pair is dropped (6/11 stuck bug)', () =>
    expect(healPair(['2026-10-28', '2026-11-06'], has(['2026-10-28', '2026-11-02']))).toEqual(['2026-10-28', '2026-10-28']))
  it('both gone ⇒ null (fall back to default)', () => expect(healPair(['2026-11-06', '2026-11-07'], has(['2026-10-28']))).toBeNull())
  it('unsorted pair is sorted', () => expect(healPair(['2026-11-02', '2026-10-28'], has(['2026-10-28', '2026-11-02']))).toEqual(['2026-10-28', '2026-11-02']))
  it('two-col view of a single-date pair shows ONE column (no duplicate React keys)', () =>
    expect(uniqueCols([{ date: 'a' }, { date: 'a' }]).length).toBe(1))
  it('two distinct dates stay two', () => expect(uniqueCols([{ date: 'a' }, { date: 'b' }]).length).toBe(2))
})
