import { describe, expect, it } from 'vitest'
import { isSubmitted, isDerivedTap, submittedSource, toggleField, paintField } from './submitted'

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
    expect(toggleField({ set: false, submitted: false }, 'submitted')).toEqual({ set: false, submitted: true , subOff: false })
    // t16u: a tap on a derived one now unticks it (covered below)
    expect(toggleField({ set: true, submitted: true }, 'submitted')).toEqual({ set: true, submitted: false , subOff: false })
    expect(isSubmitted(toggleField({ set: true, submitted: true }, 'submitted'))).toBe(true) // back to derived: still on via Set
  })
  it('Set taps never touch the manual flag; unsetting Set drops a derived Submitted only', () => {
    expect(toggleField({ set: true, submitted: false }, 'set')).toEqual({ set: false, submitted: false , subOff: false })
    expect(toggleField({ set: true, submitted: true }, 'set')).toEqual({ set: false, submitted: true , subOff: false })
  })
  it('paint writes the manual flag in Submitted mode and Set in Set mode', () => {
    expect(paintField({ set: false, submitted: false }, 'submitted', true)).toEqual({ set: false, submitted: true , subOff: false })
    expect(paintField({ set: true, submitted: true }, 'set', false)).toEqual({ set: false, submitted: true , subOff: false })
  })
})

// v0.46.0-beta.3 (Steve t16u): tapping a derived (auto) Submitted unticks it → manual 'off' override while Set stays on.
describe('manual off override (t16u)', () => {
  it('tap on a derived Submitted stores subOff; Set stays on; shown off', () => {
    const n = toggleField({ set: true, submitted: false }, 'submitted')
    expect(n).toEqual({ set: true, submitted: false, subOff: true })
    expect(isSubmitted(n)).toBe(false)
    expect(submittedSource(n)).toBe('off')
  })
  it('tap on an overridden-off box turns it back on (manual)', () => {
    expect(toggleField({ set: true, submitted: false, subOff: true }, 'submitted')).toEqual({ set: true, submitted: true, subOff: false })
  })
  it('any Set change drops the off override (it only lives while Set stays on)', () => {
    expect(toggleField({ set: true, submitted: false, subOff: true }, 'set')).toEqual({ set: false, submitted: false, subOff: false })
    expect(paintField({ set: true, submitted: false, subOff: true }, 'set', true)).toEqual({ set: true, submitted: false, subOff: true })
    expect(paintField({ set: true, submitted: false, subOff: true }, 'set', false)).toEqual({ set: false, submitted: false, subOff: false })
  })
  it('paint off in Submitted mode on a Set row stores the override; paint on clears it', () => {
    expect(paintField({ set: true, submitted: false }, 'submitted', false)).toEqual({ set: true, submitted: false, subOff: true })
    expect(paintField({ set: true, submitted: false, subOff: true }, 'submitted', true)).toEqual({ set: true, submitted: true, subOff: false })
    expect(paintField({ set: false, submitted: true }, 'submitted', false)).toEqual({ set: false, submitted: false, subOff: false })
  })
  it('isDerivedTap tells the UI when to show the Undo toast', () => {
    expect(isDerivedTap({ set: true, submitted: false }, 'submitted')).toBe(true)
    expect(isDerivedTap({ set: true, submitted: true }, 'submitted')).toBe(false)
    expect(isDerivedTap({ set: true, submitted: false }, 'set')).toBe(false)
  })
})
