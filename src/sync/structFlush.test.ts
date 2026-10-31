import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
const calls: Record<string, unknown>[] = []
vi.mock('./bridge', async (orig) => {
  const m = await orig<typeof import('./bridge')>()
  const state = { ok: true, schema: 1, subjects: [], roster: [], sessions: [], ticks: [] }
  return { ...m, bridgeCall: vi.fn(async (_u: string, body: Record<string, unknown>) => {
    calls.push(body)
    const structs = (body.structs as unknown[] | undefined) ?? []
    return { ok: true, applied: 0, ignored: 0, rejected: [], state, structApplied: structs.length }
  }) }
})
import { getSettings, putSettings } from '../data'
import { syncViaBridge } from './engine'
import { queueStruct, type StructOp } from './structOps'

describe('v0.44.5: queued rename/delete ops flush on Sync', () => {
  it('sends queued structs in the push and clears them after the bridge applies them', async () => {
    let q: StructOp[] = []
    q = queueStruct(q, { kind: 'rename', subjectKey: 'KGA_Eng_CW', from: '2026-10-20', to: '2026-10-21', at: '2026-10-30T00:00:00Z' })
    q = queueStruct(q, { kind: 'delete', subjectKey: 'KGB_Eng_CW', date: '2026-10-22', at: '2026-10-30T00:00:01Z' })
    await putSettings({ syncUrl: 'https://example.invalid/exec', bridgeToken: 'x', structOps: q })
    const r = await syncViaBridge(await getSettings())
    expect(r.ok).toBe(true)
    const push = calls.find((c) => c.action === 'push')!
    expect(push).toBeTruthy()
    expect((push.structs as StructOp[]).map((s) => s.kind)).toEqual(['rename', 'delete'])
    expect((await getSettings()).structOps ?? []).toEqual([])
  })
})
