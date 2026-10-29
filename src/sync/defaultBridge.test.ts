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
    expect(DEFAULT_SYNC_URL).toMatch(/^https:\/\/script\.google\.com\/macros\/s\/AKfycbzmOQ__.+\/exec$/)
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
