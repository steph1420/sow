import { describe, expect, it } from 'vitest'
import { retarget } from './pickDate'
const P: [string, string] = ['2026-10-28', '2026-11-02']

describe('v0.42.0 Q-DATES-A: targeted slot', () => {
  it('Date 2 target changes only Date 2', () => expect(retarget(P, 1, '2026-11-05')).toEqual(['2026-10-28', '2026-11-05']))
  it('Date 1 target changes only Date 1 (old bug: Date 1 could never change)', () => expect(retarget(P, 0, '2026-10-21')).toEqual(['2026-10-21', '2026-11-02']))
  it('reorder keeps oldest first', () => {
    expect(retarget(P, 1, '2026-10-20')).toEqual(['2026-10-20', '2026-10-28'])
    expect(retarget(P, 0, '2026-11-09')).toEqual(['2026-11-02', '2026-11-09'])
  })
  it('same as the other date ⇒ one date', () => expect(retarget(P, 1, '2026-10-28')).toEqual(['2026-10-28', '2026-10-28']))
  it('single-date pair: Date 2 target adds a second date', () => expect(retarget(['2026-10-28', '2026-10-28'], 1, '2026-11-04')).toEqual(['2026-10-28', '2026-11-04']))
})
