/**
 * PENDING (docs/CRDT_SYNC_PLAN.md §9) — skipped until Steve locks Q-CRDT. These become the failing-first
 * tests for v0.37.0; `./crdt` does not exist yet, so each case imports it lazily.
 */
import { describe, expect, it } from 'vitest'

const DAY = 864e5
const load = () => import(/* @vite-ignore */ './crdt' + '') as Promise<any>

describe.skip('v0.37.0 op log (pending)', () => {
  it('clock +1 day on A cannot block B’s later causal un-tick', async () => {
    const { Log } = await load()
    const a = new Log('A', () => Date.now() + DAY), b = new Log('B', () => Date.now())
    const op1 = a.local('tick.set', 'KGA_Eng_CW|2026-10-30|2', true)
    b.receive([op1])
    b.local('tick.set', 'KGA_Eng_CW|2026-10-30|2', false)
    a.receive(b.ops())
    expect(a.value('KGA_Eng_CW|2026-10-30|2')).toBe(false)
    expect(b.value('KGA_Eng_CW|2026-10-30|2')).toBe(false)
  })
  it('clock −1 day: a later causal op is applied, never "ignored"', async () => {
    const { Log } = await load()
    const a = new Log('A', () => Date.now() - DAY), s = new Log('sheet', () => Date.now())
    s.local('tick.set', 'T', false); a.receive(s.ops()); a.local('tick.set', 'T', true)
    s.receive(a.ops())
    expect(s.value('T')).toBe(true)
  })
  it('offline concurrent tick vs untick → Set wins by default, conflict recorded', async () => {
    const { Log } = await load()
    const a = new Log('A'), b = new Log('B')
    a.local('tick.set', 'T', true); b.local('tick.set', 'T', false)
    a.receive(b.ops()); b.receive(a.ops())
    expect(a.value('T')).toBe(true); expect(b.value('T')).toBe(true)
    expect(a.conflicts()).toHaveLength(1)
  })
  it('Unset-wins when the Developer option says so', async () => {
    const { Log } = await load()
    const a = new Log('A', undefined, { tickConflict: 'unset' }), b = new Log('B', undefined, { tickConflict: 'unset' })
    a.local('tick.set', 'T', true); b.local('tick.set', 'T', false)
    a.receive(b.ops())
    expect(a.value('T')).toBe(false)
  })
  it('Left: concurrent device vs sheet → sheet wins', async () => {
    const { Log } = await load()
    const a = new Log('A'), s = new Log('sheet')
    a.local('left.set', 'KGA|7', 'Left'); s.local('left.set', 'KGA|7', 'Active')
    a.receive(s.ops())
    expect(a.value('KGA|7')).toBe('Active')
  })
  it('duplicate ops are idempotent', async () => {
    const { Log } = await load()
    const a = new Log('A'), b = new Log('B')
    a.local('tick.set', 'T', true)
    b.receive(a.ops()); b.receive(a.ops())
    expect(b.ops()).toHaveLength(1)
  })
  it('clock jumping backward after a sync never skips an edit', async () => {
    const { Log } = await load()
    let t = Date.now()
    const a = new Log('A', () => t)
    a.local('tick.set', 'T1', true); a.markSent(a.ops())
    t -= DAY
    a.local('tick.set', 'T2', true)
    expect(a.unsent().map((o: any) => o.target)).toEqual(['T2'])
  })
  it('compaction keeps state identical', async () => {
    const { Log } = await load()
    const a = new Log('A')
    for (let r = 1; r <= 20; r++) a.local('tick.set', 'T' + r, r % 2 === 0)
    const before = a.state()
    a.compact()
    expect(a.state()).toEqual(before)
  })
})
