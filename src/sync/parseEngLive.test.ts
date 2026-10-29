import { describe, expect, it } from 'vitest'
import { parseCsv } from './csv'
import { parseEngTabLite } from './parseEngLite'

import kgaCw from './__fixtures__/kga_eng_cw.csv?raw'
import kgaHw from './__fixtures__/kga_eng_hw.csv?raw'
import kgbHw from './__fixtures__/kgb_eng_hw.csv?raw'

const FX: Record<string, string> = { 'kga_eng_cw.csv': kgaCw, 'kga_eng_hw.csv': kgaHw, 'kgb_eng_hw.csv': kgbHw }
const fx = (n: string) => parseCsv(FX[n]!)
const NOW = '2026-10-29T04:00:00.000Z'

describe('parseEngTabLite — live sheet shapes (2026-10-29)', () => {
  it('KGA Eng CW: Current 28/10→C, 2/11→D', () => {
    const p = parseEngTabLite('KGA_Eng_CW', fx('kga_eng_cw.csv'), NOW)
    expect(p.tickCols.map((t) => [t.col, t.date, t.source])).toEqual([
      [2, '28/10', 'current'],
      [3, '2/11', 'current'],
    ])
    expect(p.students.length).toBe(44)
    expect(p.marks.length).toBe(88)
    expect(p.marks.find((m) => m.roll === 2 && m.date === '2026-10-28')?.set).toBe(true)
    expect(p.marks.find((m) => m.roll === 1 && m.date === '2026-11-02')?.set).toBe(false)
    expect(p.current).toMatchObject({ date1: '28/10', topic1: 'Q', date2: '2/11', topic2: 'Q' })
  })
  it('KGA Eng HW: 7/10, 14/10 topics P p', () => {
    const p = parseEngTabLite('KGA_Eng_HW', fx('kga_eng_hw.csv'), NOW)
    expect(p.tickCols.map((t) => t.date)).toEqual(['7/10', '14/10'])
    expect(p.marks.length).toBe(p.students.length * 2)
    expect(p.marks[0]?.topic).toBe('P p')
  })
  it('KGB Eng HW collapsed: header 30/9 on C, D unpaired → warning, no invented marks', () => {
    const p = parseEngTabLite('KGB_Eng_HW', fx('kgb_eng_hw.csv'), NOW)
    expect(p.tickCols.map((t) => [t.col, t.date])).toEqual([[2, '30/9']])
    expect(p.marks.length).toBe(p.students.length)
    expect(p.notes.join(' ')).toMatch(/col D/)
  })
})
