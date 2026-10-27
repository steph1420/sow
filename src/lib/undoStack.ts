import type { ClassKey } from '../db'

/** Snapshot of a mark row used to restore undo/redo. */
export type MarkSnap = {
  roll: number
  name: string
  date: string
  topic: string
  set: boolean
  submitted: boolean
}

export type UndoEntry = {
  /** Apply these to undo */
  undo: MarkSnap[]
  /** Apply these to redo */
  redo: MarkSnap[]
}

type Stacks = { undo: UndoEntry[]; redo: UndoEntry[] }

const stacks = new Map<ClassKey, Stacks>()

function ensure(classKey: ClassKey): Stacks {
  let s = stacks.get(classKey)
  if (!s) {
    s = { undo: [], redo: [] }
    stacks.set(classKey, s)
  }
  return s
}

export function pushUndo(classKey: ClassKey, entry: UndoEntry): void {
  const s = ensure(classKey)
  s.undo.push(entry)
  s.redo = []
  // Cap stack size
  if (s.undo.length > 50) s.undo.shift()
}

export function popUndo(classKey: ClassKey): UndoEntry | null {
  const s = ensure(classKey)
  const entry = s.undo.pop() ?? null
  if (entry) s.redo.push(entry)
  return entry
}

export function popRedo(classKey: ClassKey): UndoEntry | null {
  const s = ensure(classKey)
  const entry = s.redo.pop() ?? null
  if (entry) s.undo.push(entry)
  return entry
}

export function canUndo(classKey: ClassKey): boolean {
  return ensure(classKey).undo.length > 0
}

export function canRedo(classKey: ClassKey): boolean {
  return ensure(classKey).redo.length > 0
}

/** Test helper */
export function clearUndoStacks(): void {
  stacks.clear()
}
