import { describe, expect, it } from 'vitest'
import { daysInMonth, fromIso, toIso, turn, weekdayShort, yearOptions } from './dial'

describe('v0.41.0 date dials (t108u v4)', () => {
  it('days in month incl. leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29)
    expect(daysInMonth(2026, 10)).toBe(31)
    expect(daysInMonth(2026, 11)).toBe(30)
  })
  it('iso round trip', () => {
    expect(fromIso('2026-10-28')).toEqual({ y: 2026, m: 10, d: 28 })
    expect(toIso({ y: 2026, m: 1, d: 5 })).toBe('2026-01-05')
  })
  it('Date dial wraps within the month; Month dial carries the year (v0.43 Year-bug fix)', () => {
    expect(turn({ y: 2026, m: 10, d: 31 }, 'date', 1)).toEqual({ y: 2026, m: 10, d: 1 })
    expect(turn({ y: 2026, m: 10, d: 1 }, 'date', -1)).toEqual({ y: 2026, m: 10, d: 31 })
    expect(turn({ y: 2026, m: 12, d: 5 }, 'month', 1)).toEqual({ y: 2027, m: 1, d: 5 })
    expect(turn({ y: 2026, m: 1, d: 5 }, 'month', -1)).toEqual({ y: 2025, m: 12, d: 5 })
  })
  it('turning the month clamps the date (31 Oct → 30 Nov, 31 Jan → 28 Feb)', () => {
    expect(turn({ y: 2026, m: 10, d: 31 }, 'month', 1)).toEqual({ y: 2026, m: 11, d: 30 })
    expect(turn({ y: 2027, m: 1, d: 31 }, 'month', 1)).toEqual({ y: 2027, m: 2, d: 28 })
  })
  it('Day is display-only and follows the date', () => {
    expect(weekdayShort({ y: 2026, m: 10, d: 28 })).toBe('Wed')
    expect(weekdayShort({ y: 2026, m: 10, d: 22 })).toBe('Thu')
    expect(weekdayShort({ y: 2026, m: 11, d: 2 })).toBe('Mon')
  })
  it('year dropdown covers session years ± 1, sorted', () => {
    expect(yearOptions(2026, ['2025-04-10', '2026-10-28'])).toEqual([2024, 2025, 2026, 2027])
  })
})
