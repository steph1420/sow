import { useRef } from 'react'
import type { DateSlot } from '../types'

type Row = { date: DateSlot; n: number; total: number }
type Props = { classLabel: string; mode: 'set' | 'submitted'; rows: Row[]; left: number; onClose: () => void }

/** v0.39.0 (t79u/t80u) Quick overview — both dates at a glance. Tools › Quick overview · swipe up on the Checklist tab · O. */
export function QuickOverviewSheet({ classLabel, mode, rows, left, onClose }: Props) {
  const drag = useRef<{ y: number; id: number } | null>(null)
  const sheet = useRef<HTMLDivElement>(null)
  return (
    <>
      <button type="button" className="qo-scrim" aria-label="Dismiss quick overview" onClick={onClose} />
      <div
        className="qo-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Quick overview"
        ref={sheet}
        onPointerDown={(e) => { drag.current = { y: e.clientY, id: e.pointerId } }}
        onPointerMove={(e) => {
          const d = drag.current; if (!d || d.id !== e.pointerId) return
          const dy = Math.max(0, e.clientY - d.y)
          if (sheet.current) sheet.current.style.transform = `translateY(${dy}px)`
        }}
        onPointerUp={(e) => {
          const d = drag.current; drag.current = null
          if (sheet.current) sheet.current.style.transform = ''
          if (d && e.clientY - d.y > 60) onClose()
        }}
        onPointerCancel={() => { drag.current = null; if (sheet.current) sheet.current.style.transform = '' }}
      >
        <div className="qo-handle" aria-hidden />
        <div className="qo-head">
          <h2>Quick overview</h2>
          <span className="qo-class">{classLabel} · {mode === 'set' ? 'Set' : 'Submitted'}</span>
        </div>
        {rows.map(({ date, n, total }) => {
          const pct = total ? Math.round((n / total) * 100) : 0
          return (
            <div className="qo-date" key={date.date}>
              <div className="qo-top">
                <b>{date.dayLabel} · {date.dayNum}</b>
                <span className="qo-count">{n}/{total} {mode === 'set' ? 'set' : 'submitted'}</span>
              </div>
              {date.topic ? <div className="qo-topic">{date.topic}</div> : null}
              <div className="qo-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={n} aria-label={`${date.dayLabel} ${pct}%`}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="qo-sub">{total - n} pending · {pct}%</div>
            </div>
          )
        })}
        <div className="qo-foot">{left ? `${left} left the class (not counted)` : 'No pupils marked Left'}</div>
        <button type="button" className="qo-close" data-dialog-close onClick={onClose}>Close</button>
      </div>
    </>
  )
}
