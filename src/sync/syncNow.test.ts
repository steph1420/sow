import { describe, expect, it } from 'vitest'
import { classKeyForTab, classKeysForSubject, subjectOf } from '../data/types'

describe('multi-subject sync helpers', () => {
  it('maps Eng/Math class keys; Sci has none yet (honest)', () => {
    expect(classKeysForSubject('Eng').every((k) => subjectOf(k) === 'Eng')).toBe(true)
    expect(classKeysForSubject('Sci')).toEqual([])
  })
  it('tab name → classKey', () => {
    expect(classKeyForTab('KGA Eng CW')).toBe('KGA_Eng_CW')
    expect(classKeyForTab('KGB Math HW')).toBe('KGB_Math_HW')
    expect(classKeyForTab('SoW_Marks')).toBeNull()
    expect(classKeyForTab('KGA Sci CW')).toBeNull()
  })
})
