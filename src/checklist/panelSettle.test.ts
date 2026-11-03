import { describe, expect, it } from 'vitest'
import { decidePanel, createPanelSettle } from './panelSettle'

describe('decidePanel', () => {
  it('hide on >=24 down, show on >=24 up or top, else keep', () => {
    expect(decidePanel(100, 124, 24)).toBe('hide')
    expect(decidePanel(100, 76, 24)).toBe('show')
    expect(decidePanel(100, 110, 24)).toBe('keep')
    expect(decidePanel(10, 0, 24)).toBe('show')
  })
})

describe('panel settle controller (finger down = frozen)', () => {
  function rig() {
    let t: (() => void) | null = null
    const calls: string[] = []
    let y = 0
    const c = createPanelSettle({
      getY: () => y,
      onDecide: (d) => calls.push(d),
      settleMs: () => 120,
      thresholdPx: () => 24,
      setTimer: (fn) => { t = fn; return 1 },
      clearTimer: () => { t = null },
    })
    return { c, calls, setY: (v: number) => { y = v }, fire: () => { const f = t; t = null; f?.() }, pending: () => t != null }
  }
  it('no decision while touching; decides after settle', () => {
    const r = rig()
    r.setY(200); r.c.touchStart()
    r.setY(260); r.c.scroll()
    expect(r.pending()).toBe(false)
    r.c.touchEnd()
    r.setY(300); r.c.scroll() // momentum restarts the timer
    r.fire()
    expect(r.calls).toEqual(['hide'])
  })
  it('scroll up beyond threshold shows', () => {
    const r = rig()
    r.setY(300); r.c.touchStart(); r.setY(250); r.c.touchEnd(); r.fire()
    expect(r.calls).toEqual(['show'])
  })
  it('wheel/programmatic scroll without touch uses last settled y', () => {
    const r = rig()
    r.setY(0); r.c.scroll(); r.fire()
    r.setY(50); r.c.scroll(); r.fire()
    expect(r.calls).toEqual(['show', 'hide'])
  })
})
