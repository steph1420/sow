// v0.29.1 — delayed save never drops a class and flushes on hide (t2u).
import { describe, expect, it, vi } from 'vitest'
import { createPersistQueue } from './persistQueue'

describe('persistQueue', () => {
  it('edits to two classes inside the delay both persist', () => {
    vi.useFakeTimers()
    const write = vi.fn()
    const q = createPersistQueue(write, 280)
    q.schedule('A', 1)
    q.schedule('B', 2)
    vi.advanceTimersByTime(300)
    expect(write.mock.calls).toEqual([['A', 1], ['B', 2]])
    vi.useRealTimers()
  })
  it('latest payload per class wins', () => {
    vi.useFakeTimers()
    const write = vi.fn()
    const q = createPersistQueue(write, 280)
    q.schedule('A', 1)
    q.schedule('A', 3)
    vi.advanceTimersByTime(300)
    expect(write.mock.calls).toEqual([['A', 3]])
    vi.useRealTimers()
  })
  it('flushAll writes immediately and only once', () => {
    vi.useFakeTimers()
    const write = vi.fn()
    const q = createPersistQueue(write, 280)
    q.schedule('A', 1)
    q.flushAll()
    expect(write).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(300)
    expect(write).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
