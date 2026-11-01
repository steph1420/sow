// v0.46.0 (t5u): manual Submitted syncs through bridge 0.46 (Ticks!J) and is never lost on bridge 0.44 or during migration.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const h = vi.hoisted(() => ({ bodies: [] as Record<string, unknown>[], sub: undefined as boolean | undefined, version: '0.44.0', stamp: '2026-10-01T00:00:00.000Z' }))
vi.mock('./bridge', async (orig) => {
  const m = await orig<typeof import('./bridge')>()
  const state = () => ({
    ok: true, schema: 1, version: h.version,
    subjects: [{ subjectKey: 'KGB_Eng_CW', active: true }],
    roster: [{ classKey: 'KGB', roll: 1, name: 'Demo One', status: 'Active', updatedAt: '2026-10-01T00:00:00.000Z' }],
    sessions: [{ sessionId: 'KGB_Eng_CW|2026-10-28', subjectKey: 'KGB_Eng_CW', classKey: 'KGB', date: '2026-10-28', topic: 'T', status: 'Open', updatedAt: '2026-10-01T00:00:00.000Z' }],
    ticks: [{ tickId: 'KGB_Eng_CW|2026-10-28|1', sessionId: 'KGB_Eng_CW|2026-10-28', subjectKey: 'KGB_Eng_CW', classKey: 'KGB', roll: 1, set: false, updatedAt: h.stamp, ...(h.sub === undefined ? {} : { sub: h.sub }) }],
  })
  return { ...m, bridgeCall: vi.fn(async (_u: string, body: Record<string, unknown>) => { h.bodies.push(body); return body.action === 'push' ? { ok: true, version: h.version, applied: 0, ignored: 0, rejected: [], state: state() } : state() }) }
})
import { getMark, getSettings, putMark, putSettings } from '../data'
import { resetDbForTests } from '../data/db'
import { buildPushPayload } from './bridge'
import { syncViaBridge } from './engine'

const local = (submitted: boolean, updatedAt = '2026-10-01T00:00:00.000Z') =>
  putMark({ classKey: 'KGB_Eng_CW', roll: 1, name: 'Demo One', date: '2026-10-28', topic: 'T', set: false, submitted, updatedAt }, { fromSheet: true })

beforeEach(async () => {
  await resetDbForTests()
  h.bodies = []; h.sub = undefined; h.version = '0.44.0'; h.stamp = '2026-10-01T00:00:00.000Z'
  await putSettings({ syncUrl: 'https://example.invalid/exec', bridgeToken: 'x', engSyncState: { KGB_Eng_CW: { hash: 'bridge', sheetSeenAt: '', lastSyncAt: '' } } })
})

describe('Submitted sync', () => {
  it('push ticks carry the manual flag (sub) and the push carries clientNow', async () => {
    const p = buildPushPayload([{ markId: 'a', classKey: 'KGB_Eng_CW', roll: 1, name: '', date: '2026-10-28', topic: '', set: false, submitted: true, updatedAt: '2026-10-02T00:00:00.000Z' }], [], '2026-10-01T00:00:00.000Z')
    expect(p.ticks[0]).toMatchObject({ sub: true })
    await local(true, '2026-10-02T00:00:00.000Z')
    await putSettings({ bridgeSyncAt: '2026-10-01T12:00:00.000Z' })
    await syncViaBridge(await getSettings())
    expect(h.bodies[0]!.action).toBe('push')
    expect(typeof h.bodies[0]!.clientNow).toBe('string')
  })
  it('bridge 0.44 (no sub on the sheet): the phone keeps its manual Submitted', async () => {
    await local(true)
    await syncViaBridge(await getSettings())
    expect((await getMark('KGB_Eng_CW', 1, '2026-10-28'))?.submitted).toBe(true)
  })
  it('bridge 0.46 first contact: old manual ticks are kept and sent as migrate ops until the sheet shows them', async () => {
    await local(true)
    h.version = '0.46.0'; h.sub = false
    await syncViaBridge(await getSettings())
    expect((await getMark('KGB_Eng_CW', 1, '2026-10-28'))?.submitted).toBe(true)
    await syncViaBridge(await getSettings())
    const last = h.bodies[h.bodies.length - 1]!
    expect(last.action).toBe('push')
    expect(last.subs).toEqual([{ subjectKey: 'KGB_Eng_CW', date: '2026-10-28', roll: 1, updatedAt: '2026-10-01T00:00:00.000Z' }])
    h.sub = true
    await syncViaBridge(await getSettings())
    const m = await getMark('KGB_Eng_CW', 1, '2026-10-28')
    expect(m?.submitted).toBe(true); expect(m?.sheetSub).toBe(true)
    h.bodies = []
    await syncViaBridge(await getSettings())
    expect(h.bodies[0]!.action).toBe('pull') // nothing left to migrate
  })
  it('bridge 0.46: a newer sheet sub wins (another phone ticked or cleared it)', async () => {
    await local(false)
    h.version = '0.46.0'; h.sub = true; h.stamp = '2026-10-05T00:00:00.000Z'
    await syncViaBridge(await getSettings())
    expect((await getMark('KGB_Eng_CW', 1, '2026-10-28'))?.submitted).toBe(true)
    h.sub = false; h.stamp = '2026-10-06T00:00:00.000Z'
    await syncViaBridge(await getSettings())
    expect((await getMark('KGB_Eng_CW', 1, '2026-10-28'))?.submitted).toBe(false)
  })
})
