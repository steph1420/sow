import { describe, expect, it } from 'vitest'
import { canSyncNow } from './syncGate'

describe('canSyncNow (v0.44.1)', () => {
  it('bridge-connected device can Sync with no discovered tabs (private TEST copy)', () => {
    expect(canSyncNow({ busy: false, online: true, selected: 0, connectedPush: true })).toBe(true)
  })
  it('sheet-only device still needs a selected tab', () => {
    expect(canSyncNow({ busy: false, online: true, selected: 0, connectedPush: false })).toBe(false)
    expect(canSyncNow({ busy: false, online: true, selected: 2, connectedPush: false })).toBe(true)
  })
  it('busy or offline blocks', () => {
    expect(canSyncNow({ busy: true, online: true, selected: 2, connectedPush: true })).toBe(false)
    expect(canSyncNow({ busy: false, online: false, selected: 2, connectedPush: true })).toBe(false)
  })
})

import { shouldSkipAutoSync } from './syncGate'
// v0.46.0 (t4u): skip an automatic sync when nothing is waiting and the last sync was < 60 s ago. Manual Sync never skips.
describe('shouldSkipAutoSync (v0.46.0)', () => {
  const now = Date.parse('2026-11-01T10:00:00.000Z')
  const base = { changes: 0, syncDirty: false, queued: 0, lastSyncAt: '2026-11-01T09:59:30.000Z', now }
  it('skips a clean, recent auto sync', () => expect(shouldSkipAutoSync(base)).toBe(true))
  it('never skips with changes, a dirty flag, queued topic/struct ops, or a sync older than 60 s', () => {
    expect(shouldSkipAutoSync({ ...base, changes: 1 })).toBe(false)
    expect(shouldSkipAutoSync({ ...base, syncDirty: true })).toBe(false)
    expect(shouldSkipAutoSync({ ...base, queued: 2 })).toBe(false)
    expect(shouldSkipAutoSync({ ...base, lastSyncAt: '2026-11-01T09:58:59.000Z' })).toBe(false)
    expect(shouldSkipAutoSync({ ...base, lastSyncAt: undefined })).toBe(false)
    expect(shouldSkipAutoSync({ ...base, lastSyncAt: '2026-11-01T10:05:00.000Z' })).toBe(false) // clock moved back: sync
  })
})
