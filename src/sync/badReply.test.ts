// v0.46.0-beta.4 (Steve t29u, break-it run 2): a failed or malformed bridge reply must leave local changes dirty and show an error.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettings, putSettings } from '../data/api'
import { resetDbForTests } from '../data/db'
import { seedIfEmpty } from '../data/seed'
import { syncViaBridge } from './engine'

const REPLIES: [string, () => Response][] = [
  ['ok:false', () => new Response('{"ok":false,"error":"Service invoked too many times"}', { status: 200 })],
  ['empty body', () => new Response('', { status: 200 })],
  ['ok:true without state', () => new Response('{"ok":true}', { status: 200 })],
  ['wrong types', () => new Response('{"ok":true,"applied":"x","rejected":"nope","state":null}', { status: 200 })],
  ['state with no arrays', () => new Response('{"ok":true,"applied":1,"state":{"ticks":5}}', { status: 200 })],
]
beforeEach(async () => {
  await resetDbForTests(); await seedIfEmpty()
  await putSettings({ syncUrl: 'https://script.google.com/macros/s/TEST/exec', bridgeToken: 'x', sheetUrl: '', syncDirty: true, topicEdits: { 'KGA_Eng_CW|2026-10-20': { topic: 'T', updatedAt: '2026-10-20T00:00:00.000Z' } } as never })
})
afterEach(() => vi.unstubAllGlobals())
describe('bad bridge replies keep local changes', () => {
  for (const [name, mk] of REPLIES) it(name, async () => {
    vi.stubGlobal('fetch', async () => mk())
    const r = await syncViaBridge(await getSettings())
    const s = await getSettings()
    expect(r.ok).toBe(false)
    expect(s.syncDirty).toBe(true)
    expect(s.lastSyncError).toBeTruthy()
  })
})
