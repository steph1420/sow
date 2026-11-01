import { describe, expect, it } from 'vitest'
import { isSubmitted, submittedSource, toggleField, paintField } from './submitted'

// v0.46.0 (Steve t5u): Set implies Submitted; Submitted is either derived (follows Set) or manual (stays ticked).
describe('Submitted = manual OR Set', () => {
  it('derived follows Set on and off; manual stays regardless of Set', () => {
    expect(isSubmitted({ set: true, submitted: false })).toBe(true)
    expect(isSubmitted({ set: false, submitted: false })).toBe(false)
    expect(isSubmitted({ set: false, submitted: true })).toBe(true)
    expect(submittedSource({ set: true, submitted: false })).toBe('derived')
    expect(submittedSource({ set: true, submitted: true })).toBe('manual')
    expect(submittedSource({ set: false, submitted: false })).toBe('none')
  })
  it('a tap on Submitted makes it manual; un-ticking a manual one clears it back to derived', () => {
    expect(toggleField({ set: false, submitted: false }, 'submitted')).toEqual({ set: false, submitted: true })
    expect(toggleField({ set: true, submitted: false }, 'submitted')).toEqual({ set: true, submitted: true })
    expect(toggleField({ set: true, submitted: true }, 'submitted')).toEqual({ set: true, submitted: false })
    expect(isSubmitted(toggleField({ set: true, submitted: true }, 'submitted'))).toBe(true) // back to derived: still on via Set
  })
  it('Set taps never touch the manual flag; unsetting Set drops a derived Submitted only', () => {
    expect(toggleField({ set: true, submitted: false }, 'set')).toEqual({ set: false, submitted: false })
    expect(toggleField({ set: true, submitted: true }, 'set')).toEqual({ set: false, submitted: true })
  })
  it('paint writes the manual flag in Submitted mode and Set in Set mode', () => {
    expect(paintField({ set: false, submitted: false }, 'submitted', true)).toEqual({ set: false, submitted: true })
    expect(paintField({ set: true, submitted: true }, 'set', false)).toEqual({ set: false, submitted: true })
  })
})
