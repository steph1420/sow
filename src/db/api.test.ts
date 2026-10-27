import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getMark,
  getSettings,
  listMarks,
  listStudents,
  putSettings,
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
  it('seeds classes, Left kids, session marks', async () => {
    const r = await seedIfEmpty()
    expect(r.seeded).toBe(true)
    const again = await seedIfEmpty()
    expect(again.seeded).toBe(false)

    const kga = await listStudents('KGA_Eng_CW')
    expect(kga.length).toBeGreaterThanOrEqual(10)

    const roster = await rosterWithLeft('KGA_Eng_CW')
    const left = roster.filter((s) => s.left).map((s) => s.name)
    expect(left).toContain('Ishita Kumari')
    expect(left).toContain('Riyaarth Narayan')

    const kgb = await rosterWithLeft('KGB_Eng_CW')
    expect(kgb.find((s) => s.name.includes('Rudransh'))?.left).toBe(true)

    const marks = await listMarks('KGA_Eng_CW', '14/10')
    expect(marks.some((m) => m.roll === 1 && m.set && m.submitted)).toBe(true)
  })

  it('settings CRUD', async () => {
    await seedIfEmpty()
    await putSettings({ hideLeft: true, sheetUrl: 'https://docs.google.com/spreadsheets/d/abc/edit' })
    const s = await getSettings()
    expect(s.hideLeft).toBe(true)
    expect(s.sheetUrl).toContain('spreadsheets')
  })

  it('toggle set/submitted independently', async () => {
    await seedIfEmpty()
    await toggleMarkField('KGA_Eng_CW', 4, '14/10', 'set', 'Kabir Mehta', 'Topic P')
    let m = await getMark('KGA_Eng_CW', 4, '14/10')
    expect(m?.set).toBe(true)
    expect(m?.submitted).toBe(false)

    await toggleMarkField('KGA_Eng_CW', 4, '14/10', 'submitted', 'Kabir Mehta', 'Topic P')
    m = await getMark('KGA_Eng_CW', 4, '14/10')
    expect(m?.set).toBe(true)
    expect(m?.submitted).toBe(true)
  })

  it('setAllMarks skips Left', async () => {
    await seedIfEmpty()
    const roster = await rosterWithLeft('KGA_Eng_CW')
    const n = await setAllMarks('KGA_Eng_CW', '14/10', 'Topic P', 'set', true, roster)
    expect(n).toBe(roster.filter((s) => !s.left).length)
    const ishita = await getMark('KGA_Eng_CW', 3, '14/10')
    expect(ishita).toBeUndefined()
  })

  it('setLeft only via roster meta', async () => {
    await seedIfEmpty()
    await setLeft('KGA_Eng_CW', 4, true, 'Kabir Mehta')
    const roster = await rosterWithLeft('KGA_Eng_CW')
    expect(roster.find((s) => s.roll === 4)?.left).toBe(true)
  })
})
