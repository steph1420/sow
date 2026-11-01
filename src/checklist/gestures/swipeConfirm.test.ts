// v0.30.0 t175u — swipe-confirm styles (written first).
import { describe, expect, it } from 'vitest'
import { SWIPE_CONFIRM_STYLES, normalizeSwipeStyle, pendingFlags, pendingRowClass, washPercent } from './swipeConfirm'
import { PREFS_DEFAULTS } from '../../prefs/appPrefs'

describe('swipe-confirm styles', () => {
  it('offers all six; trailing wash is the default (Steve t5u "I like trailing wash")', () => {
    expect(SWIPE_CONFIRM_STYLES.map((s) => s.id)).toEqual(['blue', 'tint', 'ghost', 'sliver', 'wash', 'ghostTint'])
    expect(PREFS_DEFAULTS['gestures.swipeConfirmStyle']).toBe('wash')
  })
  it('unknown stored value falls back to wash', () => {
    expect(normalizeSwipeStyle('nope')).toBe('wash')
    expect(normalizeSwipeStyle(undefined)).toBe('wash')
    expect(normalizeSwipeStyle('wash')).toBe('wash')
  })
  it('B+A: single row = ghost only; ≥2 rows add the tint', () => {
    expect(pendingFlags('ghostTint', 1)).toEqual({ ring: false, tint: false, ghost: true, sliver: false, wash: false })
    expect(pendingFlags('ghostTint', 2)).toEqual({ ring: false, tint: true, ghost: true, sliver: false, wash: false })
  })
  it('each single style sets exactly its own flag', () => {
    expect(pendingFlags('blue', 1).ring).toBe(true)
    for (const s of ['tint', 'ghost', 'sliver', 'wash'] as const) {
      const f = pendingFlags(s, 3)
      expect(Object.values(f).filter(Boolean)).toHaveLength(1)
      expect(f.ring).toBe(false)
    }
  })
  it('row classes: blue keeps paint-glow; others never use the ring/glow class', () => {
    expect(pendingRowClass('blue', 1, true)).toBe(' paint-glow')
    expect(pendingRowClass('ghost', 1, true)).toBe(' pc pc-ghost')
    expect(pendingRowClass('ghostTint', 2, false)).toBe(' pc pc-tint pc-ghost pc-clear')
    expect(pendingRowClass('ghost', 1, true)).not.toContain('paint-glow')
  })
  it('wash follows the finger (0–100%)', () => {
    expect(washPercent(150, 100, 200)).toBe(25)
    expect(washPercent(0, 100, 200)).toBe(0)
    expect(washPercent(999, 100, 200)).toBe(100)
  })
})

// v0.46.0-beta.4 (Steve t23u): the trailing wash follows the swipe direction.
import { washDir, washTrail } from './swipeConfirm'
describe('wash follows swipe direction', () => {
  it('direction flips only after a clear move (no jitter flips)', () => {
    expect(washDir('ltr', 100, 90)).toBe('rtl')
    expect(washDir('rtl', 100, 120)).toBe('ltr')
    expect(washDir('rtl', 100, 101)).toBe('rtl')
    expect(washDir('ltr', 100, 99)).toBe('ltr')
  })
  it('trail is measured from the edge the swipe came from', () => {
    expect(washTrail(300, 0, 400, 'ltr')).toBe(75)
    expect(washTrail(300, 0, 400, 'rtl')).toBe(25)
    expect(washTrail(-50, 0, 400, 'rtl')).toBe(100)
  })
})
