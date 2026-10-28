import { beforeEach, describe, expect, it } from 'vitest'
import {
  canRedo,
  canUndo,
  clearUndoStacks,
  popRedo,
  popUndo,
  pushUndo,
} from './undoStack'

beforeEach(() => clearUndoStacks())

describe('undoStack', () => {
  it('push / undo / redo', () => {
    pushUndo('KGA', {
      undo: [{ roll: 1, date: 'd', set: false, submitted: false }],
      redo: [{ roll: 1, date: 'd', set: true, submitted: false }],
    })
    expect(canUndo('KGA')).toBe(true)
    expect(canRedo('KGA')).toBe(false)
    const u = popUndo('KGA')
    expect(u?.undo[0]?.set).toBe(false)
    expect(canRedo('KGA')).toBe(true)
    const r = popRedo('KGA')
    expect(r?.redo[0]?.set).toBe(true)
  })

  it('push clears redo', () => {
    pushUndo('KGA', { undo: [], redo: [] })
    popUndo('KGA')
    pushUndo('KGA', { undo: [], redo: [] })
    expect(canRedo('KGA')).toBe(false)
  })
})
