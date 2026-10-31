import { describe, expect, it } from 'vitest'
import { groupAllDates, isPastDate } from './allDates'
describe('v0.44 All dates', () => {
  it('newest first, grouped by month, upcoming tagged', () => {
    const g = groupAllDates(['2026-10-14', '2026-11-02', '2026-10-30'], '2026-10-31')
    expect(g.map((x) => x.label)).toEqual(['November 2026', 'October 2026'])
    expect(g[0]!.rows[0]).toMatchObject({ iso: '2026-11-02', upcoming: true })
    expect(g[1]!.rows.map((r) => r.iso)).toEqual(['2026-10-30', '2026-10-14'])
    expect(g[1]!.rows[0]!.upcoming).toBe(false)
  })
  it('past = older than the current (newest shown) checklist date', () => {
    expect(isPastDate('2026-10-14', ['2026-10-28', '2026-11-02'])).toBe(true)
    expect(isPastDate('2026-10-28', ['2026-10-28', '2026-11-02'])).toBe(false)
    expect(isPastDate('2026-11-05', ['2026-10-28', '2026-11-02'])).toBe(false)
  })
})
