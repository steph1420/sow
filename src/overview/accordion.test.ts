import { describe, expect, it } from 'vitest'
import { DEMO_SESSIONS } from '../demo/workspaceData'

describe('overview accordion data', () => {
  it('keeps flat stable order with Math mid-list (no promote hero)', () => {
    const ids = DEMO_SESSIONS.map((s) => s.id)
    expect(ids[0]).toContain('KGA_Eng_CW')
    expect(ids[1]).toContain('KGB_Eng_CW')
    expect(ids[2]).toContain('KGA_Math_CW')
    // Math is not forced to index 0 — expand-in-place relies on this order
    expect(ids.indexOf('KGA_Math_CW|2026-10-28')).toBe(2)
  })

  it('every session carries subject + kind for tags/filters', () => {
    for (const s of DEMO_SESSIONS) {
      expect(['Eng', 'Math', 'Sci']).toContain(s.subject)
      expect(['CW', 'HW']).toContain(s.kind)
    }
  })
})
