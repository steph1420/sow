import { describe, expect, it } from 'vitest'
import { historyFromIdb } from './workspaceData'

const sess = (classKey: string, date1: string, topic1: string, date2 = '', topic2 = '') =>
  ({ sessionId: `${classKey}|current`, classKey, date1, topic1, date2, topic2, createdAt: '', updatedAt: '' }) as never

describe('P2-1 history from sheet', () => {
  it('lists every pulled date per class, newest first', () => {
    const h = historyFromIdb(
      [sess('KGA_Eng_CW', '2026-10-28', 'Q', '2026-11-02', 'Q'), sess('KGB_Eng_HW', '2026-09-30', 'N n')],
      () => 44,
    )
    expect(h.map((x) => x.id)).toEqual(['KGA_Eng_CW|2026-11-02', 'KGA_Eng_CW|2026-10-28', 'KGB_Eng_HW|2026-09-30'])
    expect(h[2]!.date.dayNum).toBe('30/9')
  })
})
