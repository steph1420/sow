import { describe, expect, it } from 'vitest'
import { queueStruct, remainingStructs, type StructOp } from './structOps'
const at = '2026-10-31T06:00:00.000Z'
describe('v0.44 rename/delete op queue', () => {
  it('queues rename and delete with ids', () => {
    let q: StructOp[] = []
    q = queueStruct(q, { kind: 'rename', subjectKey: 'KGA_Eng_CW', from: '2026-10-28', to: '2026-10-29', at })
    q = queueStruct(q, { kind: 'delete', subjectKey: 'KGA_Eng_CW', date: '2026-11-02', at })
    expect(q.map((x) => x.kind)).toEqual(['rename', 'delete'])
    expect(new Set(q.map((x) => x.id)).size).toBe(2)
  })
  it('chains renames A→B then B→C into A→C', () => {
    let q: StructOp[] = []
    q = queueStruct(q, { kind: 'rename', subjectKey: 'K', from: 'A', to: 'B', at })
    q = queueStruct(q, { kind: 'rename', subjectKey: 'K', from: 'B', to: 'C', at })
    expect(q).toHaveLength(1); expect(q[0]).toMatchObject({ from: 'A', to: 'C' })
  })
  it('delete after rename deletes the original date', () => {
    let q: StructOp[] = []
    q = queueStruct(q, { kind: 'rename', subjectKey: 'K', from: 'A', to: 'B', at })
    q = queueStruct(q, { kind: 'delete', subjectKey: 'K', date: 'B', at })
    expect(q).toEqual([expect.objectContaining({ kind: 'delete', date: 'A' })])
  })
  it('undo of a delete still pending removes it', () => {
    let q: StructOp[] = []
    q = queueStruct(q, { kind: 'delete', subjectKey: 'K', date: 'A', at })
    q = queueStruct(q, { kind: 'undelete', subjectKey: 'K', date: 'A', at })
    expect(q).toEqual([])
  })
  it('old bridge (structApplied undefined) keeps everything pending; new bridge drops what was sent', () => {
    const q = queueStruct([], { kind: 'delete', subjectKey: 'K', date: 'A', at })
    expect(remainingStructs(q, q, undefined)).toEqual(q)
    expect(remainingStructs(q, q, 1)).toEqual([])
  })
})

import { ticksOutsideStructs } from './structOps'
describe('ticksOutsideStructs (v0.44.1 TEST-bridge resurrection)', () => {
  const t = (date: string, set = false) => ({ subjectKey: 'KGB_Eng_CW', date, topic: 'x', roll: 1, set, updatedAt: '2026-10-31T18:31:00.000Z' })
  const ops = [
    { id: 'a', kind: 'delete' as const, subjectKey: 'KGB_Eng_CW', date: '2026-12-28', at: '2026-10-31T18:30:00.000Z' },
    { id: 'b', kind: 'rename' as const, subjectKey: 'KGB_Eng_CW', from: '2026-12-30', to: '2026-12-29', at: '2026-10-31T18:30:00.000Z' },
  ]
  it('drops clear-ticks for deleted and renamed-from dates sent with the op', () => {
    const out = ticksOutsideStructs([t('2026-12-28'), t('2026-12-30'), t('2026-12-29', true), t('2026-11-02', true)], ops)
    expect(out.map((x) => x.date)).toEqual(['2026-12-29', '2026-11-02'])
  })
  it('other subjects untouched', () => {
    expect(ticksOutsideStructs([{ ...t('2026-12-28'), subjectKey: 'KGA_Eng_CW' }], ops)).toHaveLength(1)
  })
})
