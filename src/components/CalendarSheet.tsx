import { useMemo, useState } from 'react'
import {
  MONTH_NAMES,
  buildMonthCells,
  formatSheetDate,
  parseSheetDate,
  sameSheetDay,
} from '../lib/shortDate'

type Props = {
  /** Currently applied Checklist date (`dd/mm`) */
  appliedDate: string | null
  /** Session slot dates that get green dots */
  sessionDates: string[]
  onCancel: () => void
  onConfirm: (sheetDate: string) => void
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default function CalendarSheet({ appliedDate, sessionDates, onCancel, onConfirm }: Props) {
  const [today] = useState(() => new Date())
  const applied = useMemo(
    () => (appliedDate ? parseSheetDate(appliedDate, today) : null),
    [appliedDate, today],
  )
  const sessionSet = useMemo(() => {
    const s = new Set<string>()
    for (const raw of sessionDates) {
      const d = parseSheetDate(raw, today)
      if (d) s.add(ymd(d))
    }
    return s
  }, [sessionDates, today])

  const [cursor, setCursor] = useState(() => {
    const base = applied ?? today
    return { y: base.getFullYear(), m: base.getMonth() }
  })
  const [draft, setDraft] = useState<Date>(() => applied ?? today)

  const cells = useMemo(() => buildMonthCells(cursor.y, cursor.m), [cursor.y, cursor.m])

  function prevMonth() {
    setCursor((c) => {
      const d = new Date(c.y, c.m - 1, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }
  function nextMonth() {
    setCursor((c) => {
      const d = new Date(c.y, c.m + 1, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  return (
    <div className="cl-sheet-layer" role="presentation">
      <button type="button" className="cl-sheet-scrim" aria-label="Close" onClick={onCancel} />
      <div className="cl-sheet cl-cal-sheet" role="dialog" aria-label="Calendar">
        <div className="cl-sheet-handle" aria-hidden />
        <div className="cal-nav">
          <button type="button" className="cal-nav-btn" aria-label="Previous month" onClick={prevMonth}>
            ‹
          </button>
          <h3 className="cal-title">
            {MONTH_NAMES[cursor.m]} {cursor.y}
          </h3>
          <button type="button" className="cal-nav-btn" aria-label="Next month" onClick={nextMonth}>
            ›
          </button>
        </div>
        <div className="cal-wd" aria-hidden>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
            <span key={`${w}-${i}`}>{w}</span>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((cell) => {
            const isDraft = sameSheetDay(cell.date, draft)
            const isApplied = applied ? sameSheetDay(cell.date, applied) : false
            const isToday = sameSheetDay(cell.date, today)
            const isSession = sessionSet.has(ymd(cell.date))
            const cls = [
              'cal-day',
              !cell.inMonth ? 'out' : '',
              isDraft ? 'draft' : '',
              isApplied ? 'applied' : '',
            ]
              .filter(Boolean)
              .join(' ')
            let dot: 'session' | 'active' | 'today' | null = null
            if (isApplied) dot = 'active'
            else if (isSession) dot = 'session'
            else if (isToday) dot = 'today'
            return (
              <button
                key={ymd(cell.date)}
                type="button"
                className={cls}
                onClick={() => {
                  setDraft(cell.date)
                  if (!cell.inMonth) {
                    setCursor({ y: cell.date.getFullYear(), m: cell.date.getMonth() })
                  }
                }}
              >
                <span className="cal-num">{cell.date.getDate()}</span>
                {dot ? <span className={`cal-dot ${dot}`} aria-hidden /> : null}
              </button>
            )
          })}
        </div>
        <div className="cal-actions">
          <button type="button" className="cal-btn cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="cal-btn confirm"
            onClick={() => onConfirm(formatSheetDate(draft))}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
