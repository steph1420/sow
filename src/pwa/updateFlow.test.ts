// v0.30.1 (t4u) — the installed app checks for a new build when it comes back to the foreground and
// reloads onto it once the new service worker takes control, without interrupting a gesture.
import { describe, expect, it, vi } from 'vitest'
import { installUpdateFlow } from './updateFlow'

function env(hidden = false) {
  const doc = new EventTarget() as EventTarget & { visibilityState: string }
  doc.visibilityState = hidden ? 'hidden' : 'visible'
  const win = new EventTarget()
  const sw = new EventTarget()
  return { doc, win, sw }
}

describe('PWA update flow', () => {
  it('checks for an update when the app returns to the foreground and on focus', () => {
    const e = env(); const update = vi.fn(); const reload = vi.fn()
    installUpdateFlow({ doc: e.doc, win: e.win, sw: e.sw, update, reload, flush: vi.fn() })
    e.doc.visibilityState = 'visible'; e.doc.dispatchEvent(new Event('visibilitychange'))
    e.win.dispatchEvent(new Event('focus'))
    expect(update).toHaveBeenCalledTimes(2)
  })
  it('new SW takes control → flush saves, then reload onto the new build', async () => {
    vi.useFakeTimers()
    const e = env(); const reload = vi.fn(); const flush = vi.fn()
    installUpdateFlow({ doc: e.doc, win: e.win, sw: e.sw, update: vi.fn(), reload, flush, settleMs: 400 })
    e.sw.dispatchEvent(new Event('controllerchange'))
    expect(flush).toHaveBeenCalled()
    vi.advanceTimersByTime(450)
    expect(reload).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
  it('never reloads mid-gesture: waits for the finger to lift', () => {
    vi.useFakeTimers()
    const e = env(); const reload = vi.fn()
    installUpdateFlow({ doc: e.doc, win: e.win, sw: e.sw, update: vi.fn(), reload, flush: vi.fn(), settleMs: 400 })
    e.win.dispatchEvent(new Event('pointerdown'))
    e.sw.dispatchEvent(new Event('controllerchange'))
    vi.advanceTimersByTime(2000)
    expect(reload).not.toHaveBeenCalled()
    e.win.dispatchEvent(new Event('pointerup'))
    vi.advanceTimersByTime(450)
    expect(reload).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})

describe('first install', () => {
  it('does not reload when there was no previous service worker', () => {
    vi.useFakeTimers()
    const e = env(); const reload = vi.fn()
    installUpdateFlow({ doc: e.doc, win: e.win, sw: e.sw, update: vi.fn(), reload, flush: vi.fn(), hadController: false })
    e.sw.dispatchEvent(new Event('controllerchange'))
    vi.advanceTimersByTime(1000)
    expect(reload).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
  it('a later build in the same session (first claim, then a new SW) does reload', () => {
    vi.useFakeTimers()
    const e = env(); const reload = vi.fn()
    installUpdateFlow({ doc: e.doc, win: e.win, sw: e.sw, update: vi.fn(), reload, flush: vi.fn(), hadController: false })
    e.sw.dispatchEvent(new Event('controllerchange'))
    e.sw.dispatchEvent(new Event('controllerchange'))
    vi.advanceTimersByTime(1000)
    expect(reload).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
  it('v0.40.2: polls for a new build every 5 min while the tab is visible (open desktop tab)', () => {
    const ev = () => new EventTarget()
    const doc = Object.assign(ev(), { visibilityState: 'visible' })
    let tick: (() => void) | null = null; let ms = 0; let n = 0
    installUpdateFlow({ doc, win: ev(), sw: ev(), update: () => { n++ }, reload: () => {}, flush: () => {}, setInterval: (fn, m) => { tick = fn; ms = m } })
    expect(ms).toBe(300000)
    tick!(); expect(n).toBe(1)
    doc.visibilityState = 'hidden'; tick!(); expect(n).toBe(1)
  })
})
