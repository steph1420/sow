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
