import { describe, expect, it } from 'vitest'
import {
  extractDate,
  findRosterStart,
  parseBoolCell,
  parseEngTabLite,
  sheetDateToIso,
} from './parseEngLite'

describe('parseEngLite', () => {
  it('extracts dates and bools', () => {
    expect(extractDate('Date 28/10')).toBe('28/10')
    expect(parseBoolCell('TRUE')).toBe(true)
    expect(parseBoolCell('no')).toBe(false)
    expect(sheetDateToIso('28/10')).toBe('2026-10-28')
  })

  it('parses roster + tick column', () => {
    const rows = [
      ['Roll', 'Name', '28/10 Nouns', 'x', 'x', 'Current', 'Topic'],
      ['', '', '28/10', '', '', '', ''],
      ['', '', '', '', '', '28/10', 'Nouns'],
      ['', '', '', '', '', '2/11', 'Pic'],
      ['1', 'Aaditya', 'TRUE'],
      ['2', 'Aayat', 'FALSE'],
    ]
    expect(findRosterStart(rows)).toBe(4)
    const parsed = parseEngTabLite('KGA_Eng_CW', rows, '2026-10-28T00:00:00.000Z')
    expect(parsed.students).toHaveLength(2)
    expect(parsed.marks.some((m) => m.roll === 1 && m.set)).toBe(true)
    expect(parsed.marks.some((m) => m.roll === 2 && !m.set)).toBe(true)
  })
})
