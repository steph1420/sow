import { describe, expect, it } from 'vitest'
import { extractSheetId } from './sheetId'
import { parseCsv } from './csv'
import { parseRosterRows } from './parseRoster'
import { applyLeftSeeds } from './leftSeed'
import { mergeByKey } from './merge'
import { parseSessions, parseMarks } from './parseSow'

describe('sheetId', () => {
  it('extracts from URL', () => {
    expect(
      extractSheetId('https://docs.google.com/spreadsheets/d/1SdbZP8dHmNl2xhd9_srt6n-U2gqkQH8Aj7du5B5Mviw/edit#gid=0'),
    ).toBe('1SdbZP8dHmNl2xhd9_srt6n-U2gqkQH8Aj7du5B5Mviw')
  })
})

describe('parseRosterRows', () => {
  it('reads roll+name and skips empties', () => {
    const csv = `"Roll","Name"\n"","","x"\n"1","Aaditya Chauhan"\n"2","Aayat Asif"\n"","Nope"\n"3",""\n`
    const rows = parseCsv(csv)
    const students = parseRosterRows('KGA_Eng_CW', rows)
    expect(students.map((s) => s.roll)).toEqual([1, 2])
    expect(students[0].name).toBe('Aaditya Chauhan')
  })
})

describe('SoW parsers + merge', () => {
  it('parses sessions and marks', () => {
    const sessions = parseSessions([
      ['sessionId', 'classKey', 'date1', 'topic1', 'date2', 'topic2', 'createdAt', 'updatedAt'],
      ['abc', 'KGA_Eng_CW', '14/10', 'P', '26/10', 'P', '2026-01-01', '2026-01-02'],
    ])
    expect(sessions).toHaveLength(1)
    const marks = parseMarks([
      ['markId', 'classKey', 'roll', 'name', 'date', 'topic', 'set', 'submitted', 'updatedAt'],
      ['KGA_Eng_CW|1|14/10', 'KGA_Eng_CW', '1', 'A', '14/10', 'P', 'TRUE', 'FALSE', '2026-01-02'],
    ])
    expect(marks[0].set).toBe(true)
    expect(marks[0].submitted).toBe(false)
  })

  it('merge keeps higher updatedAt', () => {
    const merged = mergeByKey(
      [{ id: 'a', updatedAt: '2026-01-02', v: 1 }],
      [{ id: 'a', updatedAt: '2026-01-03', v: 2 }],
      (x) => x.id,
    )
    expect(merged[0].v).toBe(2)
  })
})

describe('left seeds', () => {
  it('marks Ishita left when meta missing', () => {
    const students = [
      { id: 'KGA_Eng_CW|3', classKey: 'KGA_Eng_CW' as const, roll: 3, name: 'Ishita Kumari' },
    ]
    const meta = applyLeftSeeds(students, [])
    expect(meta[0].left).toBe(true)
  })
})
