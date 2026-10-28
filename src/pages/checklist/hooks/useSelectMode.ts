import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'

/** Name-hold → select mode (Wave A). */
export const HOLD_SELECT_MS = 800
/** Finger slop (px) before hold is cancelled. */
export const HOLD_SLOP_PX = 12

type NameHold = { roll: number; startX: number; startY: number; timer: number | null }
type RollDrag = { active: boolean; add: boolean; lastRoll: number | null }

/**
 * Select mode: 800ms name-hold; tap name toggles; 0 selected = none;
 * roll-drag select while in mode. Exit clears selection.
 */
export function useSelectMode(listRef: RefObject<HTMLDivElement | null>) {
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const nameHoldRef = useRef<NameHold | null>(null)
  const rollDragRef = useRef<RollDrag>({ active: false, add: true, lastRoll: null })

  const exitSelect = useCallback(() => {
    setSelectMode(false)
    setSelected(new Set())
  }, [])

  /** Enter select (e.g. Copy chip) — keeps current selection if any. */
  const enterSelect = useCallback(() => {
    setSelectMode(true)
  }, [])

  const toggleSelected = useCallback((roll: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(roll)) next.delete(roll)
      else next.add(roll)
      return next
    })
  }, [])

  const nameDown = useCallback(
    (e: ReactPointerEvent, roll: number, left: boolean) => {
      if (left) return
      if (selectMode) {
        toggleSelected(roll)
        return
      }
      if (nameHoldRef.current?.timer) window.clearTimeout(nameHoldRef.current.timer)
      const timer = window.setTimeout(() => {
        if (nameHoldRef.current && nameHoldRef.current.roll === roll) {
          setSelectMode(true)
          setSelected(new Set([roll]))
          nameHoldRef.current = null
        }
      }, HOLD_SELECT_MS)
      nameHoldRef.current = { roll, startX: e.clientX, startY: e.clientY, timer }
    },
    [selectMode, toggleSelected],
  )

  const nameMove = useCallback((e: ReactPointerEvent) => {
    const g = nameHoldRef.current
    if (!g) return
    if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > HOLD_SLOP_PX) {
      if (g.timer) window.clearTimeout(g.timer)
      nameHoldRef.current = null
    }
  }, [])

  const nameUp = useCallback(() => {
    if (nameHoldRef.current?.timer) window.clearTimeout(nameHoldRef.current.timer)
    nameHoldRef.current = null
  }, [])

  const rollDown = useCallback(
    (e: ReactPointerEvent, roll: number, left: boolean) => {
      if (!selectMode || left) return
      e.preventDefault()
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        /* */
      }
      const adding = !selected.has(roll)
      rollDragRef.current = { active: true, add: adding, lastRoll: roll }
      setSelected((prev) => {
        const next = new Set(prev)
        if (adding) next.add(roll)
        else next.delete(roll)
        return next
      })
    },
    [selectMode, selected],
  )

  const rollMove = useCallback((e: ReactPointerEvent) => {
    if (!rollDragRef.current.active || !listRef.current) return
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const row = el?.closest('[data-roll]') as HTMLElement | null
    if (!row) return
    const roll = Number(row.dataset.roll)
    if (!Number.isFinite(roll) || roll === rollDragRef.current.lastRoll) return
    rollDragRef.current.lastRoll = roll
    const adding = rollDragRef.current.add
    setSelected((prev) => {
      const next = new Set(prev)
      if (adding) next.add(roll)
      else next.delete(roll)
      return next
    })
  }, [listRef])

  const rollUp = useCallback((e: ReactPointerEvent) => {
    rollDragRef.current.active = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* */
    }
  }, [])

  return {
    selectMode,
    selected,
    selCount: selected.size,
    exitSelect,
    enterSelect,
    toggleSelected,
    nameDown,
    nameMove,
    nameUp,
    rollDown,
    rollMove,
    rollUp,
  }
}
