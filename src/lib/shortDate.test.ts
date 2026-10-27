import { describe, expect, it } from 'vitest'
import { parseSheetDate, shortDateLabel, sheetDateSortKey, historyDateLabel } from './shortDate'

describe('shortDate', () => {
  const now = new Date(2026, 9, 28) // Wed 28 Oct 2026

  it('formats dd/mm as weekday + day', () => {
    expect(shortDateLabel('28/10', now)).toBe('Wed 28')
    expect(shortDateLabel('14/10', now)).toBe('Wed 14')
  })

  it('parses single-digit month', () => {
    const d = parseSheetDate('30/9', now)
    expect(d?.getMonth()).toBe(8)
    expect(d?.getDate()).toBe(30)
  })

  it('sorts chronologically', () => {
    expect(sheetDateSortKey('14/10', now)).toBeLessThan(sheetDateSortKey('28/10', now))
  })

  it('formats history dates with month', () => {
    expect(historyDateLabel('28/10', now)).toBe('Wed 28 Oct')
    expect(historyDateLabel('30/9', now)).toBe('Wed 30 Sep')
  })
})

import { buildMonthCells, formatSheetDate, sameSheetDay } from './shortDate'

describe('calendar helpers', () => {
  it('formats sheet dates without leading zeros', () => {
    expect(formatSheetDate(new Date(2026, 9, 28))).toBe('28/10')
    expect(formatSheetDate(new Date(2026, 8, 30))).toBe('30/9')
  })

  it('builds Sunday-start October 2026 grid', () => {
    const cells = buildMonthCells(2026, 9)
    expect(cells).toHaveLength(42)
    expect(cells[0].date.getDate()).toBe(27) // Sun Sept 27
    expect(cells[0].inMonth).toBe(false)
    expect(cells[4].date.getDate()).toBe(1) // Thu Oct 1
    expect(cells[4].inMonth).toBe(true)
  })

  it('sameSheetDay', () => {
    expect(sameSheetDay(new Date(2026, 9, 28), new Date(2026, 9, 28, 12))).toBe(true)
    expect(sameSheetDay(new Date(2026, 9, 28), new Date(2026, 9, 27))).toBe(false)
  })
})
