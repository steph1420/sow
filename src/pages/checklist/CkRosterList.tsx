import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import CheckMark from '../../components/CheckMark'
import type { PaintUi } from './hooks/useHoldPaint'
import type { DateSlot, Mode, RosterRow } from './types'

type DateCol = { date: string; topic: string; slot: DateSlot }

type Props = {
  rows: RosterRow[]
  showTwoCol: boolean
  cols: DateCol[]
  mode: Mode
  markOn: (roll: number, date: string) => boolean
  latchRoll: number | null
  selectMode: boolean
  selected: Set<number>
  paintUi: PaintUi | null
  listRef?: RefObject<HTMLDivElement | null>
  onTap?: (roll: number, name: string, date: string, topic: string, left: boolean) => void
  onNameDown: (e: ReactPointerEvent, roll: number, left: boolean) => void
  onNameMove: (e: ReactPointerEvent) => void
  onNameUp: () => void
  onRollDown: (e: ReactPointerEvent, roll: number, left: boolean) => void
  onRollMove: (e: ReactPointerEvent) => void
  onRollUp: (e: ReactPointerEvent) => void
  onPaintDown: (e: ReactPointerEvent, roll: number, from: DateSlot, left: boolean) => void
  onPaintMove: (e: ReactPointerEvent) => void
  onPaintUp: (e: ReactPointerEvent, roll: number, name: string, left: boolean) => void
}

export default function CkRosterList({
  rows,
  showTwoCol,
  cols,
  mode,
  markOn,
  latchRoll,
  selectMode,
  selected,
  paintUi,
  listRef,
  onTap,
  onNameDown,
  onNameMove,
  onNameUp,
  onRollDown,
  onRollMove,
  onRollUp,
  onPaintDown,
  onPaintMove,
  onPaintUp,
}: Props) {
  if (!rows.length) {
    return <div className="ck-empty">No students match.</div>
  }

  const colClass = showTwoCol && cols.length >= 2 ? 'two-col' : 'one-col'
  const activeCols =
    showTwoCol && cols.length >= 2 ? cols.slice(0, 2) : cols[0] ? [cols[0]] : []

  return (
    <div className="ck-list" ref={listRef}>
      {rows.map((s) => {
        const isSel = selected.has(s.roll)
        const paintFrom = paintUi?.roll === s.roll ? paintUi.from : null
        const paintTo = paintUi?.roll === s.roll ? paintUi.to : null
        return (
          <div
            key={s.roll}
            className={`ck-row ${colClass}${s.left ? ' is-left' : ''}${isSel ? ' is-sel' : ''}${latchRoll === s.roll ? ' is-latch' : ''}`}
            data-roll={s.roll}
            data-letter={(s.name.trim()[0] || '#').toUpperCase()}
          >
            <div
              className="ck-roll"
              onPointerDown={(e) => onRollDown(e, s.roll, s.left)}
              onPointerMove={onRollMove}
              onPointerUp={onRollUp}
              onPointerCancel={onRollUp}
            >
              {s.roll}
            </div>
            <div
              className="ck-name"
              onPointerDown={(e) => onNameDown(e, s.roll, s.left)}
              onPointerMove={onNameMove}
              onPointerUp={onNameUp}
              onPointerCancel={onNameUp}
            >
              {s.name}
              {s.left ? <span className="ck-badge">left</span> : null}
            </div>
            {activeCols.map((c) => {
              const on = markOn(s.roll, c.date)
              const showTick = on || paintTo === c.slot
              const cls = [
                'ck-check',
                on && mode === 'set' ? 'is-set' : '',
                on && mode !== 'set' ? 'is-sub' : '',
                paintFrom === c.slot ? 'is-hold' : '',
                paintTo === c.slot ? 'is-paint' : '',
              ]
                .filter(Boolean)
                .join(' ')
              const twoColPaint = showTwoCol && activeCols.length >= 2
              return (
                <button
                  key={c.date}
                  type="button"
                  className="ck-check-hit"
                  aria-label={`${s.name} ${c.date}`}
                  disabled={s.left || selectMode}
                  onPointerDown={
                    twoColPaint
                      ? (e) => onPaintDown(e, s.roll, c.slot, s.left)
                      : undefined
                  }
                  onPointerMove={twoColPaint ? onPaintMove : undefined}
                  onPointerUp={
                    twoColPaint
                      ? (e) => onPaintUp(e, s.roll, s.name, s.left)
                      : undefined
                  }
                  onPointerCancel={
                    twoColPaint
                      ? (e) => onPaintUp(e, s.roll, s.name, s.left)
                      : undefined
                  }
                  onClick={
                    twoColPaint
                      ? undefined
                      : () => onTap?.(s.roll, s.name, c.date, c.topic, s.left)
                  }
                >
                  <span className={cls}>{showTick ? <CheckMark /> : null}</span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
