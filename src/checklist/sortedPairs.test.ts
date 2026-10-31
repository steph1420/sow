import { describe, expect, it } from 'vitest'
import { fillPair, healPair, retarget, retarget2, type Pair } from './pickDate'
const all = ['2026-10-14', '2026-10-21', '2026-10-28', '2026-11-02', '2026-11-04']
const ok = (p: Pair) => expect(p[0] <= p[1]).toBe(true)
describe('v0.44.5: columns always oldest-first on every path', () => {
  it('retarget / retarget2 (incl. swap) / fill / heal', () => {
    for (const a of all) for (const b of all) {
      const p = (a <= b ? [a, b] : [b, a]) as Pair
      for (const s of [0, 1] as const) for (const iso of all) { ok(retarget(p, s, iso)); ok(retarget2(p, s, iso, all)) }
      ok(fillPair(p, all)); ok(healPair([b, a], () => true, { two: true, all })!)
    }
  })
})
