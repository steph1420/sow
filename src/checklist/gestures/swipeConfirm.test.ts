// v0.30.0 t175u — swipe-confirm styles (written first).
import { describe, expect, it } from 'vitest'
import { SWIPE_CONFIRM_STYLES, normalizeSwipeStyle, pendingFlags, pendingRowClass, washPercent } from './swipeConfirm'
import { PREFS_DEFAULTS } from '../../prefs/appPrefs'

describe('swipe-confirm styles', () => {
  it('offers all six, blue first and default (until Steve picks)', () => {
    expect(SWIPE_CONFIRM_STYLES.map((s) => s.id)).toEqual(['blue', 'tint', 'ghost', 'sliver', 'wash', 'ghostTint'])
    expect(PREFS_DEFAULTS['gestures.swipeConfirmStyle']).toBe('blue')
  })
  it('unknown stored value falls back to blue', () => {
    expect(normalizeSwipeStyle('nope')).toBe('blue')
    expect(normalizeSwipeStyle(undefined)).toBe('blue')
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
