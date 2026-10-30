import { describe, expect, it } from 'vitest'
import { contrastVars, normalizeContrast } from './contrast'

describe('v0.41.0 contrast slider (t102u) — one value for Night and Day, accent untouched', () => {
  const base = { '--text-sec': '#9aa0aa', '--text-ter': '#868d98', '--hairline': 'rgba(255, 255, 255, 0.06)' }
  it('default (0) changes nothing', () => expect(contrastVars(0, base)).toEqual({}))
  it('stronger mixes secondary text and lines toward --text', () => {
    const v = contrastVars(1, base)
    expect(v['--text-sec']).toMatch(/color-mix\(in srgb, #9aa0aa \d+%, var\(--text\)/)
    expect(v['--hairline']).toMatch(/var\(--text\)/)
  })
  it('softer mixes toward --bg', () => {
    expect(contrastVars(-1, base)['--text-ter']).toMatch(/var\(--bg\)/)
  })
  it('never touches accent / ok / tint', () => {
    for (const c of [-1, -0.5, 0.5, 1]) for (const k of Object.keys(contrastVars(c, base))) expect(k).not.toMatch(/accent|ok|tint/)
  })
  it('clamps and snaps to 0.1 steps', () => {
    expect(normalizeContrast(3)).toBe(1); expect(normalizeContrast(-7)).toBe(-1); expect(normalizeContrast(0.26)).toBe(0.3); expect(normalizeContrast('x')).toBe(0)
  })
})
