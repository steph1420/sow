import { describe, expect, it, beforeEach } from 'vitest'
import { canRedo, canUndo, clearUndoStacks, popRedo, popUndo, pushUndo } from './undoStack'

describe('undoStack per-class', () => {
  beforeEach(() => clearUndoStacks())

  it('pushes and pops undo/redo per class', () => {
    const entry = {
      undo: [{ roll: 1, name: 'A', date: '28/10', topic: 't', set: false, submitted: false }],
      redo: [{ roll: 1, name: 'A', date: '28/10', topic: 't', set: true, submitted: false }],
    }
    pushUndo('KGA_Eng_CW', entry)
    expect(canUndo('KGA_Eng_CW')).toBe(true)
    expect(canUndo('KGB_Eng_CW')).toBe(false)
    const u = popUndo('KGA_Eng_CW')
    expect(u).toEqual(entry)
    expect(canRedo('KGA_Eng_CW')).toBe(true)
    const r = popRedo('KGA_Eng_CW')
    expect(r).toEqual(entry)
    expect(canUndo('KGA_Eng_CW')).toBe(true)
  })
})
