import { describe, expect, it } from 'vitest'
import { applyPick } from './pickDate'
const s = (date: string) => ({ date, topic: date, dayLabel: date, dayNum: date })

describe('v0.41.0 picked date replaces date 2 (calendar order kept)', () => {
  it('2-date view: replaces date 2, oldest first', () => {
    expect(applyPick([s('2026-10-28'), s('2026-11-02')], s('2026-11-05')).map((d) => d.date)).toEqual(['2026-10-28', '2026-11-05'])
    expect(applyPick([s('2026-10-28'), s('2026-11-02')], s('2026-10-21')).map((d) => d.date)).toEqual(['2026-10-21', '2026-10-28'])
  })
  it('picking date 1 again changes nothing', () => {
    expect(applyPick([s('2026-10-28'), s('2026-11-02')], s('2026-10-28')).map((d) => d.date)).toEqual(['2026-10-28', '2026-11-02'])
  })
})
