// v0.45.0: a device's first bridge pull of a class → the sheet wins entirely (demo/seed ticks never linger
// and later get pushed by auto-save / restore). Found by the v0.45.0 TEST-copy e2e run.
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
vi.mock('./bridge', async (orig) => {
  const m = await orig<typeof import('./bridge')>()
  const state = {
    ok: true, schema: 1,
    subjects: [{ subjectKey: 'KGB_Eng_CW', active: true }],
    roster: [{ classKey: 'KGB', roll: 1, name: 'Demo One', status: 'Active', updatedAt: '2026-10-01T00:00:00.000Z' }],
    sessions: [{ sessionId: 'KGB_Eng_CW|2026-10-28', subjectKey: 'KGB_Eng_CW', classKey: 'KGB', date: '2026-10-28', topic: 'T', status: 'Open', updatedAt: '2026-10-01T00:00:00.000Z' }],
    ticks: [{ tickId: 'x', sessionId: 'KGB_Eng_CW|2026-10-28', subjectKey: 'KGB_Eng_CW', classKey: 'KGB', roll: 1, set: false, updatedAt: '2026-10-01T00:00:00.000Z' }],
  }
  return { ...m, bridgeCall: vi.fn(async (_u: string, body: Record<string, unknown>) => (body.action === 'push' ? { ok: true, applied: 0, ignored: 0, rejected: [], state } : state)) }
})
import { getMark, getSettings, putMark, putSettings } from '../data'
import { syncViaBridge } from './engine'

describe('first bridge pull', () => {
  it('drops a newer local seed tick the sheet does not have', async () => {
    await putMark({ classKey: 'KGB_Eng_CW', roll: 1, name: 'Demo One', date: '2026-10-28', topic: 'T', set: true, submitted: false }, { fromSheet: true })
    await putMark({ classKey: 'KGB_Eng_CW', roll: 2, name: 'Demo Two', date: '2026-10-20', topic: 'T', set: true, submitted: false }, { fromSheet: true })
    await putSettings({ syncUrl: 'https://example.invalid/exec', bridgeToken: 'x' })
    await syncViaBridge(await getSettings())
    expect((await getMark('KGB_Eng_CW', 1, '2026-10-28'))?.set).toBe(false)
    expect(await getMark('KGB_Eng_CW', 2, '2026-10-20')).toBeUndefined()
  })
})
