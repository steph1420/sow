/** Per-key undo/redo stacks — pure logic for Phase B marks. */

export type MarkSnap = {
  roll: number
  date: string
  set: boolean
  submitted: boolean
  subOff?: boolean
}

/** v0.44.2 (t52u): a whole-date step (delete / move) — ONE undo entry that restores date + topic + ticks together. */
export type SessionStep = { label: { undo: string; redo: string }; run: (kind: 'undo' | 'redo') => void; date?: string; /** survives Sync (delete steps: the sheet has nothing for that date, so restoring can't clobber pulled data) */ keepOnSync?: boolean }
export type UndoEntry = {
  undo: MarkSnap[]
  redo: MarkSnap[]
  session?: SessionStep
}

type Stacks = { undo: UndoEntry[]; redo: UndoEntry[] }

const stacks = new Map<string, Stacks>()

function ensure(key: string): Stacks {
  let s = stacks.get(key)
  if (!s) {
    s = { undo: [], redo: [] }
    stacks.set(key, s)
  }
  return s
}

export function pushUndo(key: string, entry: UndoEntry): void {
  const s = ensure(key)
  s.undo.push(entry)
  s.redo = []
  if (s.undo.length > 50) s.undo.shift()
}

export function popUndo(key: string): UndoEntry | null {
  const s = ensure(key)
  const entry = s.undo.pop() ?? null
  if (entry) s.redo.push(entry)
  return entry
}

export function popRedo(key: string): UndoEntry | null {
  const s = ensure(key)
  const entry = s.redo.pop() ?? null
  if (entry) s.undo.push(entry)
  return entry
}

export function canUndo(key: string): boolean {
  return ensure(key).undo.length > 0
}

export function canRedo(key: string): boolean {
  return ensure(key).redo.length > 0
}

export function clearUndoStacks(): void {
  // v0.44.2: a delete step survives Sync so "delete → Sync → Undo" re-pushes the date with fresh timestamps.
  for (const [k, s] of stacks) {
    const keep = s.undo.filter((e) => e.session?.keepOnSync)
    if (keep.length) stacks.set(k, { undo: keep, redo: [] })
    else stacks.delete(k)
  }
}

const mapSnaps = (s: Stacks, f: (x: MarkSnap[]) => MarkSnap[]) => {
  const fix = (l: UndoEntry[]) => l.map((e) => (e.session ? e : { ...e, undo: f(e.undo), redo: f(e.redo) })).filter((e) => e.session || e.undo.length || e.redo.length)
  s.undo = fix(s.undo); s.redo = fix(s.redo)
}
/** v0.44.2: tick steps of a deleted date can never act on it again (its ticks live in the delete step). */
export function purgeDate(key: string, date: string): void { mapSnaps(ensure(key), (x) => x.filter((m) => m.date !== date)) }
/** v0.44.2: tick steps follow a moved date. */
export function remapDate(key: string, from: string, to: string): void { mapSnaps(ensure(key), (x) => x.map((m) => (m.date === from ? { ...m, date: to } : m))) }
/** v0.44.2: undo one specific entry (toast Undo button): moves it to redo. False if it is no longer on the stack. */
export function takeEntry(key: string, entry: UndoEntry): boolean {
  const s = ensure(key); const i = s.undo.indexOf(entry)
  if (i < 0) return false
  s.undo.splice(i, 1); s.redo.push(entry)
  return true
}
