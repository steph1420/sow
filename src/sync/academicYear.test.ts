// v0.29.2 Q-FIX-6 (t3u "Keep academic year - April to March. Keep dev option.") — written first.
import { describe, expect, it } from 'vitest'
import { academicYearFor, parseEngTabLite, sheetDateToIsoAcademic } from './parseEngLite'

describe('academic year April→March', () => {
  it('Jan 2027 (AY 2026-27): 28/12 → 2026, 2/1 → 2027', () => {
    expect(sheetDateToIsoAcademic('28/12', '2027-01-05T10:00:00Z', 4)).toBe('2026-12-28')
    expect(sheetDateToIsoAcademic('2/1', '2027-01-05T10:00:00Z', 4)).toBe('2027-01-02')
  })
  it('Dec 2026: 2/1 → 2027 (same academic year)', () => {
    expect(sheetDateToIsoAcademic('2/1', '2026-12-30T10:00:00Z', 4)).toBe('2027-01-02')
  })
  it('March 2027 is still AY 2026-27; April 2027 starts AY 2027-28', () => {
    expect(sheetDateToIsoAcademic('15/4', '2027-03-20T10:00:00Z', 4)).toBe('2026-04-15')
    expect(sheetDateToIsoAcademic('15/4', '2027-04-02T10:00:00Z', 4)).toBe('2027-04-15')
  })
  it('Oct 2026 dates unchanged vs v0.29.1', () => {
    expect(sheetDateToIsoAcademic('28/10', '2026-10-29T08:00:00Z', 4)).toBe('2026-10-28')
  })
  it('configurable start month (June)', () => {
    expect(academicYearFor('2026-05-10T00:00:00Z', 6)).toBe(2025)
    expect(sheetDateToIsoAcademic('1/5', '2026-05-10T00:00:00Z', 6)).toBe('2026-05-01')
    expect(sheetDateToIsoAcademic('1/6', '2026-05-10T00:00:00Z', 6)).toBe('2025-06-01')
  })
  it('parseEngTabLite uses the academic year across Dec→Jan', () => {
    const rows = [
      ['Roll', 'Name', 'Date / Topic', 'Date / Topic', '', 'Current'],
      ['', '', '', '', '', 'Date'],
      ['1', 'Asha Demo', 'TRUE', 'FALSE', '', '28/12'],
      ['2', 'Ravi Demo', 'FALSE', 'TRUE', '', '2/1'],
    ]
    const p = parseEngTabLite('KGA_Eng_CW', rows, '2027-01-05T10:00:00Z', { yearStartMonth: 4 })
    expect([...new Set(p.marks.map((m) => m.date))].sort()).toEqual(['2026-12-28', '2027-01-02'])
  })
})
