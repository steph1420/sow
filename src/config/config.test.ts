import { describe, expect, it } from 'vitest'
import { TIMINGS, clampGraceMs, clampSettleMs, clampThresholdPx, GRACE_OPTIONS, SETTLE_OPTIONS, THRESHOLD_OPTIONS } from './index'

describe('config (v0.47.0)', () => {
  it('locked defaults', () => {
    expect(TIMINGS.pendingGraceMs).toBe(3000)
    expect(TIMINGS.panelSettleMs).toBe(120)
    expect(TIMINGS.panelThresholdPx).toBe(24)
    expect(TIMINGS.wheelIdleMs).toBe(150)
  })
  it('clamps bad values to defaults or range', () => {
    expect(clampGraceMs(undefined)).toBe(3000)
    expect(clampGraceMs(-5)).toBe(0)
    expect(clampGraceMs(99999)).toBe(10000)
    expect(clampSettleMs('x')).toBe(120)
    expect(clampThresholdPx(1)).toBe(8)
  })
  it('dev option lists include the defaults', () => {
    expect(GRACE_OPTIONS.map((o) => o.value)).toContain(3000)
    expect(SETTLE_OPTIONS.map((o) => o.value)).toContain(120)
    expect(THRESHOLD_OPTIONS.map((o) => o.value)).toContain(24)
  })
})
