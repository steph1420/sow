import { describe, expect, it } from 'vitest'
import { extractSheetId } from './sheetId'
import { parseCsv } from './csv'
import { parseRosterRows } from './parseRoster'
import { applyLeftSeeds, LEFT_SEED_KEYS } from './leftSeed'
import { mergeByKey } from './merge'
import { mergeEngMarks } from './mergeEng'
import { parseSessions, parseMarks } from './parseSow'
import {
  hashEngBlock,
  parseCurrent,
  parseEngTab,
  parseTickColumns,
} from './parseEng'

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

describe('Sync A Eng parse', () => {
  const cwRows = [
    ['Roll', 'Name', 'Date / Topic', 'Date / Topic', '', 'Current', ''],
    ['', '', '', '', '', 'Date', 'Topic'],
    ['', '', '', '', '', '28/10', 'Q'],
    ['1', 'Aaditya Chauhan', 'FALSE', 'FALSE', '', '2/11', 'Q'],
    ['2', 'Aayat Asif', 'TRUE', 'TRUE', '', '', ''],
    ['19', 'Ishita Kumari', 'FALSE', 'TRUE', '', '', ''],
  ]

  it('parses Current F3/F4 when tick row2 empty', () => {
    const current = parseCurrent(cwRows)
    expect(current.date1).toBe('28/10')
    expect(current.topic1).toBe('Q')
    expect(current.date2).toBe('2/11')
    expect(current.topic2).toBe('Q')
  })

  it('assigns Current dates LTR to tick cols with empty headers', () => {
    const current = parseCurrent(cwRows)
    const ticks = parseTickColumns(cwRows, current)
    expect(ticks).toHaveLength(2)
    expect(ticks[0].date).toBe('28/10')
    expect(ticks[1].date).toBe('2/11')
  })

  it('parseEngTab builds marks set-only', () => {
    const parsed = parseEngTab('KGA_Eng_CW', cwRows, '2026-10-27T12:00:00.000Z')
    expect(parsed.students).toHaveLength(3)
    expect(parsed.marks.some((m) => m.roll === 2 && m.date === '28/10' && m.set)).toBe(true)
    expect(parsed.marks.every((m) => m.submitted === false)).toBe(true)
    expect(parsed.hash).toMatch(/^[0-9a-f]+$/)
  })

  it('hash changes when a tick flips', () => {
    const a = hashEngBlock(cwRows, parseCurrent(cwRows), parseTickColumns(cwRows, parseCurrent(cwRows)))
    const flipped = cwRows.map((r) => [...r])
    flipped[3][2] = 'TRUE'
    const b = hashEngBlock(flipped, parseCurrent(flipped), parseTickColumns(flipped, parseCurrent(flipped)))
    expect(a).not.toBe(b)
  })

  it('reads date from tick header when Current collapsed (KGB HW style)', () => {
    const hw = [
      ['Roll ', 'Name ', 'Date / Topic 30/9 N n', 'Date / Topic ', '', 'Current Date 30/9', 'Topic N n'],
      ['1', 'Aadish Rawat', 'TRUE', 'FALSE', '', '', ''],
      ['2', 'Aakanshi Singh', 'TRUE', 'FALSE', '', '', ''],
    ]
    const current = parseCurrent(hw)
    expect(current.date1).toBe('30/9')
    const ticks = parseTickColumns(hw, current)
    expect(ticks[0].date).toBe('30/9')
    // second col has bools but no date2 → skipped
    expect(ticks.every((t) => t.date)).toBe(true)
    expect(ticks.length).toBe(1)
  })
})

describe('mergeEngMarks', () => {
  it('Eng wins when local is older than last sync', () => {
    const local = [
      {
        markId: 'KGA_Eng_CW|1|28/10',
        classKey: 'KGA_Eng_CW' as const,
        roll: 1,
        name: 'A',
        date: '28/10',
        topic: 'Q',
        set: false,
        submitted: true,
        updatedAt: '2026-10-20T00:00:00.000Z',
      },
    ]
    const eng = [
      {
        ...local[0],
        set: true,
        submitted: false,
        updatedAt: '2026-10-27T12:00:00.000Z',
      },
    ]
    const merged = mergeEngMarks(local, eng, '2026-10-26T00:00:00.000Z')
    expect(merged[0].set).toBe(true)
    expect(merged[0].submitted).toBe(true) // local submitted retained
  })

  it('local wins when updated after last sync', () => {
    const local = [
      {
        markId: 'KGA_Eng_CW|1|28/10',
        classKey: 'KGA_Eng_CW' as const,
        roll: 1,
        name: 'A',
        date: '28/10',
        topic: 'Q',
        set: false,
        submitted: false,
        updatedAt: '2026-10-27T18:00:00.000Z',
      },
    ]
    const eng = [
      {
        ...local[0],
        set: true,
        updatedAt: '2026-10-27T12:00:00.000Z',
      },
    ]
    const merged = mergeEngMarks(local, eng, '2026-10-27T10:00:00.000Z')
    expect(merged[0].set).toBe(false)
  })
})

describe('left seeds', () => {
  it('marks locked rolls Left and clears demo Left on wrong rolls', () => {
    const students = [
      { id: 'KGA_Eng_CW|3', classKey: 'KGA_Eng_CW' as const, roll: 3, name: 'Demo Kid' },
      { id: 'KGA_Eng_CW|19', classKey: 'KGA_Eng_CW' as const, roll: 19, name: 'Ishita Kumari' },
    ]
    const existing = [
      {
        id: 'KGA_Eng_CW|3',
        classKey: 'KGA_Eng_CW' as const,
        roll: 3,
        name: 'Demo Kid',
        left: true,
        updatedAt: '2026-01-01',
      },
    ]
    const meta = applyLeftSeeds(students, existing, '2026-10-27T12:00:00.000Z')
    expect(meta.find((m) => m.roll === 3)?.left).toBe(false)
    expect(meta.find((m) => m.roll === 19)?.left).toBe(true)
    expect(LEFT_SEED_KEYS.some((s) => s.roll === 19 && s.classKey === 'KGA_Eng_CW')).toBe(true)
  })
})
