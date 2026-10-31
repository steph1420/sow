// v0.45.0: snapshot retention + restore — written before the code.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getMark, listMarks, putMark, putSettings } from '../data/api'
import { resetDbForTests } from '../data/db'
import { listSnapshots, pruneIds, restoreSnapshot, takeSnapshot, type SnapMeta } from './snapshots'

beforeEach(async () => { await resetDbForTests() })

const tick = (roll: number, date: string, set: boolean, at = '2026-10-28T05:00:00.000Z') =>
  putMark({ classKey: 'KGA_Eng_CW', roll, name: `Demo ${roll}`, date, topic: 't', set, submitted: false, updatedAt: at })

describe('retention', () => {
  it('keeps the last 50 plus the newest per day for 30 days', () => {
    const now = Date.parse('2026-11-01T00:00:00Z')
    const list: SnapMeta[] = []
    // 40 days × 3 per day
    for (let d = 0; d < 40; d++) for (let h = 0; h < 3; h++) list.push({ id: `${d}-${h}`, at: new Date(now - d * 86400000 - h * 3600000).toISOString() } as SnapMeta)
    const drop = new Set(pruneIds(list, now))
    const kept = list.filter((x) => !drop.has(x.id))
    // last 50 newest kept
    const newest = [...list].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 50)
    for (const n of newest) expect(drop.has(n.id)).toBe(false)
    // one per day for days 0..29
    for (let d = 0; d < 30; d++) expect(kept.some((k) => k.id.startsWith(`${d}-`))).toBe(true)
    // nothing older than 30 days unless in last 50
    expect(kept.some((k) => k.id.startsWith('35-'))).toBe(false)
    expect(kept.length).toBeLessThanOrEqual(50 + 30)
  })
  it('never prunes a Before restore or manual snapshot inside 30 days', () => {
    const now = Date.parse('2026-11-01T00:00:00Z')
    const list: SnapMeta[] = []
    for (let i = 0; i < 60; i++) list.push({ id: `a${i}`, kind: 'auto', at: new Date(now - i * 60000).toISOString() } as SnapMeta)
    list.push({ id: 'm', kind: 'manual', at: new Date(now - 2 * 3600000).toISOString() } as SnapMeta)
    expect(pruneIds(list, now)).not.toContain('m')
  })
})

describe('snapshots', () => {
  it('auto snapshot skips when nothing changed; manual always saves', async () => {
    await tick(1, '2026-10-28', true)
    expect(await takeSnapshot('auto', 'app opened')).toBeTruthy()
    expect(await takeSnapshot('auto', 'after 1 change')).toBeNull()
    expect(await takeSnapshot('manual', 'Back up now')).toBeTruthy()
    expect((await listSnapshots()).length).toBe(2)
  })
  it('restore saves Before restore first, undoes later ticks with newer timestamps', async () => {
    await putSettings({ bridgeSyncAt: '2026-10-28T06:00:00.000Z' })
    await tick(1, '2026-10-28', true)
    const s = (await takeSnapshot('manual', 'Back up now'))!
    expect(s.ticks).toBe(1)
    await tick(2, '2026-10-28', true, '2026-10-28T07:00:00.000Z')
    await tick(1, '2026-10-28', false, '2026-10-28T07:00:00.000Z')
    const r = await restoreSnapshot(s.id)
    expect(r.undone).toBe(2)
    const m1 = await getMark('KGA_Eng_CW', 1, '2026-10-28')
    const m2 = await getMark('KGA_Eng_CW', 2, '2026-10-28')
    expect(m1!.set).toBe(true)
    expect(m2!.set).toBe(false) // cleared, not deleted → pushed as Set=false
    expect(m2!.updatedAt > '2026-10-28T07:00:00.000Z').toBe(true)
    expect(m1!.updatedAt > '2026-10-28T07:00:00.000Z').toBe(true)
    const list = await listSnapshots()
    expect(list[0]!.reason).toBe('Before restore')
    expect(list[0]!.ticks).toBe(1) // state before restore: roll 2 only
    // Undo = restore Before restore
    await restoreSnapshot(r.beforeId)
    expect((await listMarks('KGA_Eng_CW')).filter((m) => m.set).map((m) => m.roll)).toEqual([2])
  })
})
