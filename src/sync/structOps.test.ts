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
