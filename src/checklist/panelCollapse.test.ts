import { describe, expect, it, beforeEach } from 'vitest'
import { panelReducer, readCollapsed, writeCollapsed, PANEL_COLLAPSE_KEY } from './panelCollapse'

const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  ;(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) }, removeItem: (k: string) => { store.delete(k) } }
})

describe('v0.47.1 manual panel collapse (t127u)', () => {
  it('only the toggle changes the panel; an A–Z jump upward does not', () => {
    expect(panelReducer(true, { type: 'azJump', dy: -800 })).toBe(true)
    expect(panelReducer(false, { type: 'azJump', dy: -800 })).toBe(false)
    expect(panelReducer(false, { type: 'scroll', dy: -300, atTop: true })).toBe(false)
    expect(panelReducer(false, { type: 'scroll', dy: 300, atTop: false })).toBe(false)
    expect(panelReducer(false, { type: 'toggle' })).toBe(true)
    expect(panelReducer(true, { type: 'toggle' })).toBe(false)
  })
  it('state is remembered on the device (default expanded)', () => {
    expect(readCollapsed()).toBe(false)
    writeCollapsed(true)
    expect(store.get(PANEL_COLLAPSE_KEY)).toBe('1')
    expect(readCollapsed()).toBe(true)
  })
})
