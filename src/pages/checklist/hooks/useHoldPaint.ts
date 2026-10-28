import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  oppositeSlot,
  paintPhaseFromDelta,
  paintShouldCommit,
} from '../lib/paintGesture'
import type { DateSlot } from '../types'

export type PaintUi = { roll: number; from: DateSlot; to?: DateSlot }

type PaintGesture = {
  roll: number
  from: DateSlot
  startX: number
  startY: number
  held: boolean
  painted: boolean
}

type PaintCommit = {
  roll: number
  name: string
  from: DateSlot
  to: DateSlot
}

type PaintTap = {
  roll: number
  name: string
  from: DateSlot
}

/**
 * Wave A hold-paint: mostly-horizontal drag locks stroke; commit toward opposite ✓.
 * Vertical abandon → pan-y scroll wins. Short tap (no lock) → normal toggle.
 */
export function useHoldPaint(opts: {
  enabled: boolean
  selectMode: boolean
  onPaint: (c: PaintCommit) => void | Promise<void>
  onTapSlot: (t: PaintTap) => void | Promise<void>
}) {
  const { enabled, selectMode, onPaint, onTapSlot } = opts
  const paintRef = useRef<PaintGesture | null>(null)
  const [paintUi, setPaintUi] = useState<PaintUi | null>(null)

  const paintDown = useCallback(
    (e: ReactPointerEvent, roll: number, from: DateSlot, left: boolean) => {
      if (left || selectMode || !enabled) return
      paintRef.current = {
        roll,
        from,
        startX: e.clientX,
        startY: e.clientY,
        held: false,
        painted: false,
      }
    },
    [enabled, selectMode],
  )

  const paintMove = useCallback((e: ReactPointerEvent) => {
    const g = paintRef.current
    if (!g || g.roll == null) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    if (!g.held) {
      const phase = paintPhaseFromDelta({ dx, dy }, false)
      if (phase === 'abandon') {
        paintRef.current = null
        setPaintUi(null)
        return
      }
      if (phase === 'locked') {
        g.held = true
        try {
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        } catch {
          /* */
        }
        e.preventDefault()
        setPaintUi({ roll: g.roll, from: g.from })
      } else {
        return
      }
    }
    e.preventDefault()
    if (paintShouldCommit(g.from, dx)) {
      g.painted = true
      setPaintUi({ roll: g.roll, from: g.from, to: oppositeSlot(g.from) })
    } else {
      setPaintUi({ roll: g.roll, from: g.from })
    }
  }, [])

  const paintUp = useCallback(
    (e: ReactPointerEvent, roll: number, name: string, left: boolean) => {
      const g = paintRef.current
      paintRef.current = null
      setPaintUi(null)
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* */
      }
      if (left) return
      if (g && g.roll === roll && g.painted && g.held) {
        void onPaint({ roll, name, from: g.from, to: oppositeSlot(g.from) })
        return
      }
      if (g && g.roll === roll && !g.held && !g.painted) {
        void onTapSlot({ roll, name, from: g.from })
      }
    },
    [onPaint, onTapSlot],
  )

  return { paintUi, paintDown, paintMove, paintUp }
}
