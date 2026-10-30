import { describe, expect, it } from 'vitest'
import { azKeyJump, gridMove, isDesk, isTypingTarget, wideScale } from './keyboard'

const rows = [
  { roll: 1, name: 'Aarav Demo' }, { roll: 2, name: 'Bela Sample' }, { roll: 3, name: 'Diya Example' },
  { roll: 4, name: 'Dev Mock' }, { roll: 5, name: 'Dina Test' }, { roll: 6, name: 'Farah Demo' },
]

describe('v0.37.0 keyboard helpers (t62u/t64u)', () => {
  it('letter jumps to the first pupil; same letter again cycles; wraps', () => {
    expect(azKeyJump('D', rows, null)).toEqual({ roll: 3, letter: 'D', exact: true })
    expect(azKeyJump('D', rows, 3)!.roll).toBe(4)
    expect(azKeyJump('D', rows, 4)!.roll).toBe(5)
    expect(azKeyJump('D', rows, 5)!.roll).toBe(3)
    expect(azKeyJump('d', rows, 1)!.roll).toBe(3)
  })
  it('dimmed letter → next letter with pupils (Q-KBD-2), flagged not exact', () => {
    expect(azKeyJump('C', rows, null)).toEqual({ roll: 3, letter: 'D', exact: false })
    expect(azKeyJump('Z', rows, null)).toBeNull()
    expect(azKeyJump('1', rows, null)).toBeNull()
  })
  it('grid moves clamp at the edges', () => {
    expect(gridMove('ArrowDown', 0, 0, 6, 2)).toEqual([1, 0])
    expect(gridMove('ArrowUp', 0, 1, 6, 2)).toEqual([0, 1])
    expect(gridMove('ArrowRight', 2, 1, 6, 2)).toEqual([2, 1])
    expect(gridMove('ArrowLeft', 2, 1, 6, 2)).toEqual([2, 0])
    expect(gridMove('End', 2, 0, 6, 2)).toEqual([5, 0])
    expect(gridMove('Home', 4, 1, 6, 2)).toEqual([0, 1])
    expect(gridMove('PageDown', 0, 0, 6, 2)).toEqual([5, 0])
    expect(gridMove('x', 2, 0, 6, 2)).toBeNull()
  })
  it('shortcuts are off while typing', () => {
    expect(isTypingTarget({ tagName: 'INPUT', type: 'text' } as never)).toBe(true)
    expect(isTypingTarget({ tagName: 'INPUT', type: 'checkbox' } as never)).toBe(false)
    expect(isTypingTarget({ tagName: 'TEXTAREA' } as never)).toBe(true)
    expect(isTypingTarget({ tagName: 'SELECT' } as never)).toBe(true)
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true } as never)).toBe(true)
    expect(isTypingTarget({ tagName: 'BUTTON' } as never)).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
  it('widescreen scale: phones / portrait tablets unchanged; desktop by height/600, cap 2.4 (v0.40.2)', () => {
    expect(wideScale(412, 915)).toBe(1)
    expect(wideScale(360, 800)).toBe(1)
    expect(wideScale(915, 412)).toBe(1)
    expect(wideScale(800, 600)).toBe(1)
    expect(wideScale(600, 2000)).toBeCloseTo(600 / 412, 2)
    expect(wideScale(1440, 780)).toBeCloseTo(1.3, 2)
    expect(wideScale(1280, 680)).toBeCloseTo(680 / 600, 2)
    expect(wideScale(1512, 860)).toBeCloseTo(860 / 600, 2)
    expect(wideScale(1728, 980)).toBeCloseTo(980 / 600, 2)
    expect(wideScale(1024, 540)).toBe(1)
    expect(wideScale(3840, 2160)).toBe(2.4)
  })
  it('desk = landscape ≥1000 wide (fill width); phones in landscape are not desk', () => {
    expect(isDesk(1440, 780)).toBe(true)
    expect(isDesk(1024, 540)).toBe(true)
    expect(isDesk(932, 430)).toBe(false)
    expect(isDesk(1024, 1366)).toBe(false)
  })
})
