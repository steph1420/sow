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
import { fillPair, retarget2 } from './pickDate'
describe('v0.44.4 t56u: 2-date mode never collapses to one column', () => {
  const all = ['2026-10-21', '2026-10-28', '2026-11-02']
  it('[2/11,2/11] in 2-mode fills nearest earlier date', () =>
    expect(healPair(['2026-11-02', '2026-11-02'], has(all), { two: true, all })).toEqual(['2026-10-28', '2026-11-02']))
  it('only earliest left ⇒ fills next later', () =>
    expect(healPair(['2026-10-21', '2026-11-09'], has(all), { two: true, all })).toEqual(['2026-10-21', '2026-10-28']))
  it('1-date mode keeps single', () =>
    expect(healPair(['2026-11-02', '2026-11-02'], has(all), { two: false, all })).toEqual(['2026-11-02', '2026-11-02']))
  it('class with only one date stays single', () =>
    expect(healPair(['2026-11-02', '2026-11-02'], has(['2026-11-02']), { two: true, all: ['2026-11-02'] })).toEqual(['2026-11-02', '2026-11-02']))
  it('fillPair on distinct pair is identity', () => expect(fillPair(['a', 'b'], ['a', 'b', 'c'])).toEqual(['a', 'b']))
  it('pick B\'s date in column A ⇒ swap (still two columns)', () =>
    expect(retarget2(['2026-10-28', '2026-11-02'], 0, '2026-11-02', all)).toEqual(['2026-10-28', '2026-11-02']))
  it('pick other date in A from a collapsed pair ⇒ two columns', () =>
    expect(retarget2(['2026-11-02', '2026-11-02'], 1, '2026-11-02', all)).toEqual(['2026-10-28', '2026-11-02']))
  it('normal pick replaces slot', () =>
    expect(retarget2(['2026-10-28', '2026-11-02'], 1, '2026-10-21', all)).toEqual(['2026-10-21', '2026-10-28']))
})
