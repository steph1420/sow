import { describe, expect, it } from 'vitest'
import { stateToApp } from './bridge'
import { historyFromIdb } from '../demo/workspaceData'

const ses = (date: string, topic: string) => ({ sessionId: `KGB_Eng_CW|${date}`, subjectKey: 'KGB_Eng_CW', classKey: 'KGB', date, topic, status: 'Open', updatedAt: '2026-10-30T00:00:00Z' })
const state = { subjects: [{ subjectKey: 'KGB_Eng_CW', active: true }], roster: [], ticks: [], sessions: [ses('2026-11-02', 'B'), ses('2026-10-28', 'A'), ses('2026-10-14', 'Older added')] }

describe('v0.42.0: all open sessions kept after pull (no Code.js change)', () => {
  it('stateToApp keeps sessions beyond the 2 newest', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = stateToApp(state as any).sessions[0]!
    expect([s.date1, s.date2]).toEqual(['2026-11-02', '2026-10-28'])
    expect(s.others).toEqual([{ date: '2026-10-14', topic: 'Older added' }])
  })
  it('history shows the older session', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = stateToApp(state as any).sessions
    expect(historyFromIdb(s, () => 1).map((h) => h.date.date)).toContain('2026-10-14')
  })
})
