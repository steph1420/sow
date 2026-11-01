import 'fake-indexeddb/auto'
import bridgeSrc from './defaultBridge.ts?raw'
import joinSrc from '../more/SetupDevices.tsx?raw'
import { beforeEach, describe, expect, it } from 'vitest'
import { getSettings, putSettings } from '../data/api'
import { resetDbForTests } from '../data/db'
import { DEFAULT_SYNC_URL, effectiveSyncUrl } from './defaultBridge'

beforeEach(async () => { await resetDbForTests() })

describe('v0.34.1 built-in bridge URL (t47u/t48u)', () => {
  it('is Steve\'s /exec URL', () => {
    expect(DEFAULT_SYNC_URL).toMatch(/^https:\/\/script\.google\.com\/macros\/s\/AKfycby2SaO9.+\/exec$/)
  })
  it('getSettings falls back to the built-in URL when none stored', async () => {
    expect((await getSettings()).syncUrl).toBe(DEFAULT_SYNC_URL)
    await putSettings({ syncUrl: '' })
    expect((await getSettings()).syncUrl).toBe(DEFAULT_SYNC_URL)
  })
  it('a stored override wins', async () => {
    await putSettings({ syncUrl: 'https://script.google.com/macros/s/OTHER/exec' })
    expect((await getSettings()).syncUrl).toBe('https://script.google.com/macros/s/OTHER/exec')
    expect(effectiveSyncUrl('  ')).toBe(DEFAULT_SYNC_URL)
  })
  it('no token is built in', async () => {
    expect((await getSettings()).bridgeToken ?? '').toBe('')
    expect(bridgeSrc).not.toMatch(/token\s*[:=]\s*['"][^'"]+/i)
  })
  it('Join page has no Bridge URL field unless Developer override is on', () => {
    expect(joinSrc).toMatch(/showUrlOverride\s*\?/)
  })
})

// v0.46.0 stable (Steve t34u/t37u): LIVE bridge 0.46.2 moved to a NEW deployment URL.
import { RETIRED_SYNC_URLS } from './defaultBridge'
import { syncUrlFor } from './channel'
const OLD = 'https://script.google.com/macros/s/AKfycbzmOQ__yxauJtrQ5LNxSqcEaDHjjbcZb-rzt0UuBQGVwXSURKRF1zbr6FvChAy7-hjqwA/exec'
const NEW = 'https://script.google.com/macros/s/AKfycby2SaO9tEQC_-PgLyh7EaUoK7ganHAnXuizqYtMjSFW3qEhUcO5di6cB8czYf38PAD3/exec'
describe('v0.46.0 LIVE bridge moved (t34u)', () => {
  it('built-in default is the new LIVE URL; the old one is retired', () => {
    expect(DEFAULT_SYNC_URL).toBe(NEW)
    expect(RETIRED_SYNC_URLS).toContain(OLD)
  })
  it('a phone that saved the old built-in URL (join / setup file / Sync page save) now uses the new one', async () => {
    expect(effectiveSyncUrl(OLD)).toBe(NEW)
    expect(effectiveSyncUrl(' ' + OLD + ' ')).toBe(NEW)
    await putSettings({ syncUrl: OLD })
    expect((await getSettings()).syncUrl).toBe(NEW)
  })
  it('a different saved URL is kept as is', () => {
    expect(effectiveSyncUrl('https://script.google.com/macros/s/OTHER/exec')).toBe('https://script.google.com/macros/s/OTHER/exec')
  })
  it('a Developer override is never rewritten, even if it is the old URL', () => {
    expect(syncUrlFor('stable', null, NEW, OLD)).toBe(OLD)
    expect(syncUrlFor('stable', null, NEW, 'https://script.google.com/macros/s/MINE/exec')).toBe('https://script.google.com/macros/s/MINE/exec')
  })
  it('Beta never falls back to a LIVE URL, old or new', () => {
    expect(syncUrlFor('beta', OLD, '', '')).toBe('')
    expect(syncUrlFor('beta', NEW, '', '')).toBe('')
  })
})
