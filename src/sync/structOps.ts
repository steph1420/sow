/** v0.44.0: queued session structure ops (rename / delete) sent on Sync so moved/deleted sessions don't resurrect. */
export type StructOp =
  | { id: string; kind: 'rename'; subjectKey: string; from: string; to: string; at: string }
  | { id: string; kind: 'delete'; subjectKey: string; date: string; at: string }
type In =
  | { kind: 'rename'; subjectKey: string; from: string; to: string; at: string }
  | { kind: 'delete' | 'undelete'; subjectKey: string; date: string; at: string }
let n = 0
const mkId = () => `${Date.now().toString(36)}-${(n++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export function queueStruct(q: StructOp[], op: In): StructOp[] {
  if (op.kind === 'undelete') return q.filter((x) => !(x.kind === 'delete' && x.subjectKey === op.subjectKey && x.date === op.date))
  if (op.kind === 'rename') {
    if (op.from === op.to) return q
    const prev = q.find((x) => x.kind === 'rename' && x.subjectKey === op.subjectKey && x.to === op.from)
    if (prev && prev.kind === 'rename') {
      const rest = q.filter((x) => x !== prev)
      return prev.from === op.to ? rest : [...rest, { ...prev, to: op.to, at: op.at }]
    }
    return [...q, { id: mkId(), ...op }]
  }
  const prev = q.find((x) => x.kind === 'rename' && x.subjectKey === op.subjectKey && x.to === op.date)
  if (prev && prev.kind === 'rename') return [...q.filter((x) => x !== prev), { id: mkId(), kind: 'delete', subjectKey: op.subjectKey, date: prev.from, at: op.at }]
  return [...q, { id: mkId(), kind: 'delete', subjectKey: op.subjectKey, date: op.date, at: op.at }]
}
/** structApplied undefined ⇒ bridge older than v0.44.0: keep all pending. */
export function remainingStructs(current: StructOp[], sent: StructOp[], structApplied: number | undefined): StructOp[] {
  if (structApplied === undefined) return current
  const ids = new Set(sent.map((x) => x.id))
  return current.filter((x) => !ids.has(x.id))
}
/** v0.44.1: a deleted / renamed-away session's cleared cells must not ride along with its op —
 * their updatedAt is newer than the tombstone, so the bridge would recreate the session (found on the TEST copy). */
export function ticksOutsideStructs<T extends { subjectKey: string; date: string }>(ticks: T[], structs: StructOp[]): T[] {
  const gone = new Set(structs.map((o) => `${o.subjectKey}|${o.kind === 'rename' ? o.from : o.date}`))
  return ticks.filter((t) => !gone.has(`${t.subjectKey}|${t.date}`))
}
