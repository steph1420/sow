// v0.45.0 (LOCKED A): auto-save debounce / flush / max-wait / offline queue — written before the code.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutoSaver, type AutoSaveState } from './autoSave'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(online = true, fail = false) {
  const run = vi.fn(async () => { if (fail) throw new Error('boom') })
  const states: AutoSaveState[] = []
  const net = { online }
  const s = createAutoSaver({ run, isOnline: () => net.online, onState: (st) => states.push(st) })
  return { s, run, states, net }
}

describe('auto-save A', () => {
  it('pushes once after a 2s pause, not per tick', async () => {
    const { s, run } = setup()
    for (let i = 0; i < 5; i++) { s.notify(); await vi.advanceTimersByTimeAsync(500) }
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2000)
    expect(run).toHaveBeenCalledTimes(1)
  })
  it('caps continuous ticking at 30s', async () => {
    const { s, run } = setup()
    for (let i = 0; i < 40; i++) { s.notify(); await vi.advanceTimersByTimeAsync(1000) }
    expect(run.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(run.mock.calls.length).toBeLessThanOrEqual(2)
  })
  it('flush() pushes immediately (pagehide / hidden)', async () => {
    const { s, run } = setup()
    s.notify(); s.flush()
    await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(1)
  })
  it('offline queues with a count and saves itself when back online', async () => {
    const { s, run, states, net } = setup(false)
    s.notify(); s.notify(); s.notify()
    await vi.advanceTimersByTimeAsync(2500)
    expect(run).not.toHaveBeenCalled()
    expect(states.at(-1)).toMatchObject({ status: 'queued', pending: 3 })
    net.online = true; s.online()
    await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(1)
    expect(states.at(-1)!.status).toBe('saved')
  })
  it('an error stays amber and keeps the count; retry() runs again', async () => {
    const { s, run, states } = setup(true, true)
    s.notify()
    await vi.advanceTimersByTimeAsync(2100)
    expect(states.at(-1)).toMatchObject({ status: 'error', pending: 1 })
    s.retry(); await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(2)
  })
  it('changes made while a push runs trigger another push after it', async () => {
    let release!: () => void
    const run = vi.fn(() => new Promise<void>((r) => { release = r }))
    const s = createAutoSaver({ run, isOnline: () => true })
    s.notify(); await vi.advanceTimersByTimeAsync(2000)
    s.notify(); release(); await vi.advanceTimersByTimeAsync(2100)
    expect(run).toHaveBeenCalledTimes(2)
  })
  it('a flush during a push never leaves the icon stuck on saving', async () => {
    let release!: () => void
    const run = vi.fn(() => new Promise<void>((r) => { release = r }))
    const states: AutoSaveState[] = []
    const s = createAutoSaver({ run, isOnline: () => true, onState: (x) => states.push(x) })
    s.notify(); await vi.advanceTimersByTimeAsync(2000)
    s.flush(); release(); await vi.advanceTimersByTimeAsync(10)
    release(); await vi.advanceTimersByTimeAsync(3000)
    expect(states.at(-1)!.status).toBe('idle')
  })
  it('saved fades back to idle', async () => {
    const { s, states } = setup()
    s.notify(); await vi.advanceTimersByTimeAsync(2000)
    expect(states.map((x) => x.status)).toContain('saving')
    await vi.advanceTimersByTimeAsync(3000)
    expect(states.at(-1)!.status).toBe('idle')
  })
})
