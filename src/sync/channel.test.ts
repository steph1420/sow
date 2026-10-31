import { describe, expect, it } from 'vitest'
import { dbNameFor, readChannel, syncUrlFor } from './channel'
import { DEFAULT_SYNC_URL } from './defaultBridge'
describe('v0.44 Stable/Beta data source', () => {
  it('channel defaults to stable', () => { expect(readChannel(null)).toBe('stable'); expect(readChannel('beta')).toBe('beta'); expect(readChannel('x')).toBe('stable') })
  it('separate local caches per source', () => { expect(dbNameFor('stable')).toBe('sow-app'); expect(dbNameFor('beta')).toBe('sow-app-beta') })
  it('Stable = LIVE bridge; Beta = per-device TEST url, never falls back to LIVE', () => {
    expect(syncUrlFor('stable', '', '')).toBe(DEFAULT_SYNC_URL)
    expect(syncUrlFor('beta', ' https://script.google.com/macros/s/TEST/exec ', '')).toBe('https://script.google.com/macros/s/TEST/exec')
    expect(syncUrlFor('beta', '', '')).toBe('')
    expect(syncUrlFor('beta', '', DEFAULT_SYNC_URL)).toBe('')
  })
})
