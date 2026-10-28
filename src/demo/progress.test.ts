import { describe, expect, it } from 'vitest'
import {
  DEMO_SESSIONS,
  ROSTERS,
  progressForSession,
  seedClassMarks,
} from './workspaceData'

describe('overview demo progress', () => {
  it('seeds four sessions with remock-scale KGA CW progress', () => {
    expect(DEMO_SESSIONS).toHaveLength(4)
    const key = 'KGA_Eng_CW'
    const marks = seedClassMarks(key)
    const p = progressForSession(marks, ROSTERS[key], '2026-10-28')
    expect(p.total).toBe(42)
    expect(p.set).toBe(18)
    expect(p.submitted).toBe(11)
    expect(p.pct).toBe(43)
    expect(p.tone).toBe('ok')
  })

  it('tones map by pct bands', () => {
    const key = 'KGA_Eng_HW'
    const p = progressForSession(seedClassMarks(key), ROSTERS[key], '2026-11-02')
    expect(p.set).toBe(38)
    expect(p.pct).toBe(90)
    expect(p.tone).toBe('hi')
  })
})
