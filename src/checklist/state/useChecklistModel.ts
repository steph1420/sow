import { DATE_COLS_KEY, readDateCols } from '../../dates/sessionEdit'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { prettyClassLabel, type ClassKey } from '../../data/types'
import { useWorkspace } from '../../demo/WorkspaceContext'
import { dateSlotFromIso } from '../../demo/workspaceData'
import {
  canRedo,
  canUndo,
  popRedo,
  popUndo,
  pushUndo,
  type UndoEntry,
  type MarkSnap,
} from '../../lib/undoStack'
import type { ColPills, DateSlot, MarkMode, MarksMap, StudentRow } from '../types'
import { markKey } from '../types'

function getMark(marks: MarksMap, roll: number, date: string) {
  return marks[markKey(roll, date)] ?? { set: false, submitted: false }
}

function fieldOf(m: { set: boolean; submitted: boolean }, mode: MarkMode): boolean {
  return mode === 'set' ? m.set : m.submitted
}

function classLabelOf(key: ClassKey): string {
  return prettyClassLabel(key)
}

export function useChecklistModel() {
  const { activeClassKey, marksByClass, setMarksForClass, rosterFor, datesFor, pastView, sessionDatesFor } = useWorkspace()
  const classKey = activeClassKey
  const classLabel = classLabelOf(classKey)
  const current: [DateSlot, DateSlot] = useMemo(() => datesFor(classKey), [datesFor, classKey])
  // v0.44.0: a past date shows alone; the saved pair/pills are not touched, so Back restores them exactly.
  const past = pastView && pastView.k === classKey ? dateSlotFromIso(pastView.date, sessionDatesFor(classKey).get(pastView.date) ?? '') : null
  const dates: [DateSlot, DateSlot] = useMemo(() => (past ? [past, past] : current), [past?.date, past?.topic, current]) // eslint-disable-line react-hooks/exhaustive-deps
  const roster: StudentRow[] = rosterFor(classKey)
  const marks = marksByClass[classKey]

  const setMarks = useCallback(
    (next: MarksMap | ((prev: MarksMap) => MarksMap)) => {
      setMarksForClass(classKey, next)
    },
    [classKey, setMarksForClass],
  )

  const [mode, setMode] = useState<MarkMode>('set')
  // v0.43.0 (Q-V43 #7): 1|2 date view is remembered on this device only. v0.44.0: a new device starts with 1 date.
  const [pills, setPills] = useState<ColPills>(() => { try { return readDateCols(localStorage.getItem(DATE_COLS_KEY), false) === 1 ? [false, true] : [true, true] } catch { return [true, true] } })
  useEffect(() => { try { localStorage.setItem(DATE_COLS_KEY, pills[0] && pills[1] ? '2' : '1') } catch { /* private mode */ } }, [pills])
  const [pendingOnly, setPendingOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [undoTick, setUndoTick] = useState(0)

  const showTwoCol = !past && pills[0] && pills[1]
  const activeDateIndex: 0 | 1 = past ? 0 : pills[0] ? 0 : 1
  const visibleDates: DateSlot[] = showTwoCol
    ? [dates[0], dates[1]]
    : [dates[activeDateIndex]]

  const togglePill = useCallback((i: 0 | 1) => {
    setPills((prev) => {
      const next: ColPills = [...prev] as ColPills
      next[i] = !next[i]
      if (!next[0] && !next[1]) next[i === 0 ? 1 : 0] = true
      return next
    })
  }, [])

  const applySnaps = useCallback(
    (snaps: MarkSnap[]) => {
      setMarks((prev) => {
        const next = { ...prev }
        for (const s of snaps) {
          next[markKey(s.roll, s.date)] = { set: s.set, submitted: s.submitted }
        }
        return next
      })
    },
    [setMarks],
  )

  const commitMarks = useCallback(
    (changes: { roll: number; date: string; set: boolean; submitted: boolean }[]) => {
      if (!changes.length) return
      const before: MarkSnap[] = []
      const after: MarkSnap[] = []
      for (const c of changes) {
        const cur = getMark(marks, c.roll, c.date)
        before.push({ roll: c.roll, date: c.date, set: cur.set, submitted: cur.submitted })
        after.push({ roll: c.roll, date: c.date, set: c.set, submitted: c.submitted })
      }
      setMarks((prev) => {
        const next = { ...prev }
        for (const c of changes) {
          next[markKey(c.roll, c.date)] = { set: c.set, submitted: c.submitted }
        }
        return next
      })
      pushUndo(classKey, { undo: before, redo: after })
      setUndoTick((t) => t + 1)
    },
    [classKey, marks, setMarks],
  )

  const toggleCell = useCallback(
    (roll: number, date: string) => {
      const cur = getMark(marks, roll, date)
      const next = { ...cur, [mode]: !fieldOf(cur, mode) }
      commitMarks([{ roll, date, set: next.set, submitted: next.submitted }])
    },
    [marks, mode, commitMarks],
  )

  const setCellsValue = useCallback(
    (targets: { roll: number; date: string }[], value: boolean) => {
      const changes = targets.map(({ roll, date }) => {
        const cur = getMark(marks, roll, date)
        return {
          roll,
          date,
          set: mode === 'set' ? value : cur.set,
          submitted: mode === 'submitted' ? value : cur.submitted,
        }
      })
      commitMarks(changes)
    },
    [marks, mode, commitMarks],
  )

  const paintCells = useCallback(
    (rolls: number[], date: string, value: boolean) => {
      setCellsValue(
        rolls.map((roll) => ({ roll, date })),
        value,
      )
    },
    [setCellsValue],
  )

  const copyField = useCallback(
    (fromDate: string, toDate: string) => {
      const active = roster.filter((r) => !r.left)
      const changes = active.map((r) => {
        const src = getMark(marks, r.roll, fromDate)
        const dst = getMark(marks, r.roll, toDate)
        return {
          roll: r.roll,
          date: toDate,
          set: mode === 'set' ? src.set : dst.set,
          submitted: mode === 'submitted' ? src.submitted : dst.submitted,
        }
      })
      commitMarks(changes)
    },
    [roster, marks, mode, commitMarks],
  )

  /** v0.41.0: return the entry so the page can name it in a toast (t101u). */
  const undo = useCallback((): UndoEntry | null => {
    const e = popUndo(classKey)
    if (!e) return null
    applySnaps(e.undo)
    setUndoTick((t) => t + 1)
    return e
  }, [classKey, applySnaps])

  const redo = useCallback((): UndoEntry | null => {
    const e = popRedo(classKey)
    if (!e) return null
    applySnaps(e.redo)
    setUndoTick((t) => t + 1)
    return e
  }, [classKey, applySnaps])

  const filteredRoster = useMemo(() => {
    const q = query.trim().toLowerCase()
    return roster.filter((r) => {
      if (r.left) return false
      if (q) {
        const hit = r.name.toLowerCase().includes(q) || String(r.roll).includes(q)
        if (!hit) return false
      }
      if (pendingOnly) {
        const allDone = visibleDates.every((d) => fieldOf(getMark(marks, r.roll, d.date), mode))
        if (allDone) return false
      }
      return true
    })
  }, [roster, query, pendingOnly, visibleDates, marks, mode])

  const counts = useMemo(() => {
    const active = roster.filter((r) => !r.left)
    const d0 = dates[0].date
    const d1 = dates[1].date
    let set0 = 0
    let set1 = 0
    for (const r of active) {
      if (getMark(marks, r.roll, d0).set) set0++
      if (getMark(marks, r.roll, d1).set) set1++
    }
    return { active: active.length, set0, set1, submitted0: 0 }
  }, [roster, marks, dates])

  const isOn = useCallback(
    (roll: number, date: string) => fieldOf(getMark(marks, roll, date), mode),
    [marks, mode],
  )

  const progressFor = useCallback(
    (date: string) => {
      const active = roster.filter((r) => !r.left)
      let n = 0
      for (const r of active) if (fieldOf(getMark(marks, r.roll, date), mode)) n++
      return { n, total: active.length }
    },
    [roster, marks, mode],
  )

  return {
    classKey,
    classLabel,
    dates,
    roster,
    marks,
    mode,
    setMode,
    pills,
    setPills,
    togglePill,
    pendingOnly,
    setPendingOnly,
    query,
    setQuery,
    searchOpen,
    setSearchOpen,
    showTwoCol,
    past,
    currentNewest: current[1],
    activeDateIndex,
    visibleDates,
    filteredRoster,
    counts,
    isOn,
    progressFor,
    toggleCell,
    setCellsValue,
    paintCells,
    copyField,
    undo,
    redo,
    canUndo: canUndo(classKey),
    canRedo: canRedo(classKey),
    undoTick,
    getMark: (roll: number, date: string) => getMark(marks, roll, date),
  }
}

export type ChecklistModel = ReturnType<typeof useChecklistModel>
