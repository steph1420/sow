import { describe, expect, it } from 'vitest'
import { betaFlavorDefaults, dbNameFor, readChannel, syncUrlFor, validBridgeUrl } from './channel'
import { DEFAULT_SYNC_URL } from './defaultBridge'
import { LIVE_SHEET_ID, TEST_SHEET_ID, TEST_EXEC_URL, describeConnection, sheetLabel } from './connectionCheck'

// v0.46.0 (t7u "Dev opt", t8u separate Beta site, connection check)
describe('bridge URL override (Settings › Developer)', () => {
  const O = 'https://script.google.com/macros/s/AKfyOVERRIDE_x-1/exec'
  it('validates /exec URLs only', () => {
    expect(validBridgeUrl(O)).toBe(true)
    expect(validBridgeUrl('https://evil.example/macros/s/x/exec')).toBe(false)
    expect(validBridgeUrl('https://script.google.com/macros/s/x/dev')).toBe(false)
    expect(validBridgeUrl('')).toBe(false)
  })
  it('a valid override wins on both channels; invalid/blank is ignored', () => {
    expect(syncUrlFor('stable', '', '', O)).toBe(O)
    expect(syncUrlFor('beta', '', '', O)).toBe(O)
    expect(syncUrlFor('stable', '', '', 'junk')).toBe(DEFAULT_SYNC_URL)
    expect(syncUrlFor('beta', 'https://script.google.com/macros/s/TEST/exec', '', ' ')).toBe('https://script.google.com/macros/s/TEST/exec')
  })
})

describe('Beta site flavor (steph1420.github.io/sow-beta)', () => {
  it('is always Beta, defaults to the TEST /exec, own IndexedDB, never the LIVE bridge', () => {
    const f = betaFlavorDefaults('beta')
    expect(f).toEqual({ channel: 'beta', betaUrl: TEST_EXEC_URL, dbName: 'sow-beta', keyPrefix: 'sow-beta.' })
    expect(f!.betaUrl).not.toBe(DEFAULT_SYNC_URL)
    expect(betaFlavorDefaults(undefined)).toBeNull()
    expect(readChannel(null)).toBe('stable'); expect(dbNameFor('stable')).toBe('sow-app') // Stable site unchanged
  })
})

describe('connection check', () => {
  it('labels sheets by id', () => {
    expect(sheetLabel(TEST_SHEET_ID)).toBe('TEST copy')
    expect(sheetLabel(LIVE_SHEET_ID)).toBe('LIVE')
    expect(sheetLabel('abc')).toBe('Other sheet')
    expect(sheetLabel('')).toBe('Unknown sheet')
  })
  it('bridge 0.46 reports its own sheet; 0.44 falls back to the Settings sheet URL and asks for the update', () => {
    expect(describeConnection({ version: '0.46.0', sheetId: TEST_SHEET_ID }, '')).toEqual({ label: 'TEST copy', version: '0.46.0', source: 'bridge', note: '' })
    const old = describeConnection({ version: '0.44.0' }, `https://docs.google.com/spreadsheets/d/${LIVE_SHEET_ID}/edit`)
    expect(old).toMatchObject({ label: 'LIVE', version: '0.44.0', source: 'settings' })
    expect(old.note).toMatch(/0\.46/)
  })
})
