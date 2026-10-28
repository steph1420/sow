import { describe, expect, it } from 'vitest'
import { classKeysForSubject, subjectOf } from '../data/types'

describe('multi-subject sync helpers', () => {
  it('maps Eng/Math class keys; Sci has none yet (honest)', () => {
    expect(classKeysForSubject('Eng').every((k) => subjectOf(k) === 'Eng')).toBe(true)
    expect(classKeysForSubject('Math').length).toBeGreaterThan(0)
    expect(classKeysForSubject('Sci')).toEqual([])
  })
})
