import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getMark,
  getSettings,
  listMarks,
  listStudents,
  putMark,
  putSettings,
  putStudent,
  rosterWithLeft,
  setAllMarks,
  setLeft,
  toggleMarkField,
} from './api'
import { resetDbForTests } from './db'
import { seedIfEmpty } from './seed'

beforeEach(async () => {
  await resetDbForTests()
})

describe('JB-2 local store', () => {
  it('seeds settings only (no demo roster) until Sync', async () => {
    const r = await seedIfEmpty()
    expect(r.seeded).toBe(true)
    const again = await seedIfEmpty()
    expect(again.seeded).toBe(false)

    const kga = await listStudents('KGA_Eng_CW')
    expect(kga.length).toBe(0)

    const s = await getSettings()
    expect(s.sheetUrl).toContain('spreadsheets')
    expect(s.seededAt).toBeTruthy()
  })

  it('settings CRUD', async () => {
    await seedIfEmpty()
    await putSettings({ hideLeft: true, sheetUrl: 'https://docs.google.com/spreadsheets/d/abc/edit' })
    const s = await getSettings()
    expect(s.hideLeft).toBe(true)
    expect(s.sheetUrl).toContain('spreadsheets')
  })

  it('toggle + setAll skips Left', async () => {
    await putStudent({ id: 'KGA_Eng_CW|1', classKey: 'KGA_Eng_CW', roll: 1, name: 'A' })
    await putStudent({ id: 'KGA_Eng_CW|2', classKey: 'KGA_Eng_CW', roll: 2, name: 'B' })
    await setLeft('KGA_Eng_CW', 2, true, 'B')
    await putMark({
      classKey: 'KGA_Eng_CW',
      roll: 1,
      name: 'A',
      date: '28/10',
      topic: 'Q',
      set: false,
      submitted: false,
    })
    await toggleMarkField('KGA_Eng_CW', 1, '28/10', 'set', 'A', 'Q')
    const m = await getMark('KGA_Eng_CW', 1, '28/10')
    expect(m?.set).toBe(true)

    const roster = await rosterWithLeft('KGA_Eng_CW')
    const n = await setAllMarks(
      'KGA_Eng_CW',
      '28/10',
      'Q',
      'set',
      true,
      roster.map((s) => ({ roll: s.roll, name: s.name, left: s.left })),
    )
    expect(n).toBe(1) // skipped Left roll 2
    const marks = await listMarks('KGA_Eng_CW', '28/10')
    expect(marks.every((x) => x.roll !== 2 || !x.set)).toBe(true)
  })
})
