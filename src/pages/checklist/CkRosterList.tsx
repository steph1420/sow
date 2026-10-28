import type { RefObject } from 'react'
import CheckMark from '../../components/CheckMark'
import type { Mode, RosterRow } from './types'

type DateCol = { date: string; topic: string }

type Props = {
  rows: RosterRow[]
  showTwoCol: boolean
  cols: DateCol[]
  mode: Mode
  markOn: (roll: number, date: string) => boolean
  latchRoll: number | null
  /** Phase 2: real gestures. Phase 1: simple tap toggle if provided. */
  onTap?: (roll: number, name: string, date: string, topic: string, left: boolean) => void
  listRef?: RefObject<HTMLDivElement | null>
}

export default function CkRosterList({
  rows,
  showTwoCol,
  cols,
  mode,
  markOn,
  latchRoll,
  onTap,
  listRef,
}: Props) {
  if (!rows.length) {
    return <div className="ck-empty">No students match.</div>
  }

  const colClass = showTwoCol && cols.length >= 2 ? 'two-col' : 'one-col'
  const activeCols =
    showTwoCol && cols.length >= 2 ? cols.slice(0, 2) : cols[0] ? [cols[0]] : []

  return (
    <div className="ck-list" ref={listRef}>
      {rows.map((s) => (
        <div
          key={s.roll}
          className={`ck-row ${colClass}${s.left ? ' is-left' : ''}${latchRoll === s.roll ? ' is-latch' : ''}`}
          data-roll={s.roll}
          data-letter={(s.name.trim()[0] || '#').toUpperCase()}
        >
          <div className="ck-roll">{s.roll}</div>
          <div className="ck-name">
            {s.name}
            {s.left ? <span className="ck-badge">left</span> : null}
          </div>
          {activeCols.map((c) => {
            const on = markOn(s.roll, c.date)
            const cls =
              on && mode === 'set' ? 'ck-check is-set' : on ? 'ck-check is-sub' : 'ck-check'
            return (
              <button
                key={c.date}
                type="button"
                className="ck-check-hit"
                aria-label={`${s.name} ${c.date}`}
                disabled={s.left || !onTap}
                onClick={() => onTap?.(s.roll, s.name, c.date, c.topic, s.left)}
              >
                <span className={cls}>{on ? <CheckMark /> : null}</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
