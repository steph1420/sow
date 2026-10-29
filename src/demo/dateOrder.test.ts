import { describe, expect, it } from 'vitest'
import { datesFromSession, sessionsFromIdb } from './workspaceData'

const ses = (date1: string, date2: string) => ({ sessionId: 'x', classKey: 'KGA_Eng_CW', date1, topic1: 'T-' + date1, date2, topic2: 'T-' + date2, createdAt: '' }) as never

describe('t82u calendar order (oldest → newest) everywhere', () => {
  it('bridge newest-first session → columns oldest first, topics follow their dates', () => {
    const [a, b] = datesFromSession(ses('2026-11-02', '2026-10-28'))
    expect([a.date, b.date]).toEqual(['2026-10-28', '2026-11-02'])
    expect(a.topic).toBe('T-2026-10-28')
    expect(b.topic).toBe('T-2026-11-02')
  })
  it('already ascending stays', () => {
    expect(datesFromSession(ses('2026-10-28', '2026-11-02')).map((d) => d.date)).toEqual(['2026-10-28', '2026-11-02'])
  })
  it('single date duplicates', () => {
    expect(datesFromSession(ses('2026-10-28', '')).map((d) => d.date)).toEqual(['2026-10-28', '2026-10-28'])
  })
  it('Overview card still shows the newest open session', () => {
    const [c] = sessionsFromIdb([ses('2026-11-02', '2026-10-28')], () => 40)
    expect(c!.date.date).toBe('2026-11-02')
  })
})
