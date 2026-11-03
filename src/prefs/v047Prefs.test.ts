import { describe, expect, it } from 'vitest'
import { PREFS_DEFAULTS } from './appPrefs'

describe('v0.47 dev prefs', () => {
  it('defaults: push A–Z OFF (t123u), grace 3000, settle 120, threshold 24', () => {
    expect(PREFS_DEFAULTS['az.pushBelowPanel']).toBe(false)
    expect(PREFS_DEFAULTS['pending.graceMs']).toBe(3000)
    expect(PREFS_DEFAULTS['panel.settleMs']).toBe(120)
    expect(PREFS_DEFAULTS['panel.thresholdPx']).toBe(24)
  })
})
