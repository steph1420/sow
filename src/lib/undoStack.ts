/** Per-key undo/redo stacks — pure logic for Phase B marks. */

export type MarkSnap = {
  roll: number
  date: string
  set: boolean
  submitted: boolean
}

export type UndoEntry = {
  undo: MarkSnap[]
  redo: MarkSnap[]
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
  stacks.clear()
}
