import { useState } from 'react'
import type { DateSlot } from '../types'

type Props = {
  classLabel: string
  dates: [DateSlot, DateSlot]
  pills: [boolean, boolean]
  onView: (pills: [boolean, boolean]) => void
  onSaveTopic: (date: string, topic: string) => void
  onClose: () => void
}

/** v0.40.0 (t83u) Date panel — pick 1 or 2 dates and view / edit each session's topic. Opened from the header dates. */
export function DatePanelSheet({ classLabel, dates, pills, onView, onSaveTopic, onClose }: Props) {
  const same = dates[0].date === dates[1].date
  const two = pills[0] && pills[1] && !same
  const [draft, setDraft] = useState<string[]>(() => dates.map((d) => d.topic))
  const [saved, setSaved] = useState<string | null>(null)
  const save = (i: 0 | 1) => {
    const t = draft[i]!.trim()
    if (!t || t === dates[i].topic) return
    onSaveTopic(dates[i].date, t)
    setSaved(dates[i].date)
  }
  const slots = (same ? [0] : [0, 1]) as (0 | 1)[]
  return (
    <>
      <button type="button" className="qo-scrim dp-scrim" aria-label="Dismiss dates" onClick={onClose} />
      <div className="qo-sheet dp-sheet" role="dialog" aria-modal="true" aria-label="Dates and topics">
        <div className="qo-handle" aria-hidden />
        <div className="qo-head">
          <h2>Dates</h2>
          <span className="qo-class">{classLabel}</span>
        </div>
        {same ? null : (
          <div className="dp-seg" role="group" aria-label="View">
            <button type="button" aria-pressed={!two} className={!two ? 'on' : ''} onClick={() => onView([false, true])}>1 date</button>
            <button type="button" aria-pressed={two} className={two ? 'on' : ''} onClick={() => onView([true, true])}>2 dates</button>
          </div>
        )}
        {slots.map((i) => {
          const d = dates[i]
          const shown = pills[i]
          const dirty = draft[i]!.trim() !== d.topic && !!draft[i]!.trim()
          return (
            <div className={`qo-date dp-date${shown ? ' shown' : ''}`} key={d.date}>
              <div className="qo-top">
                <b>{d.dayLabel} · {d.dayNum}</b>
                {same ? null : two ? (
                  <span className="qo-count">Shown</span>
                ) : (
                  <button type="button" className={`dp-pick${shown ? ' on' : ''}`} aria-pressed={shown} onClick={() => onView(i === 0 ? [true, false] : [false, true])}>
                    {shown ? 'Showing' : 'Show'}
                  </button>
                )}
              </div>
              <label className="dp-label" htmlFor={`dp-topic-${i}`}>Topic</label>
              <div className="dp-edit">
                <input
                  id={`dp-topic-${i}`}
                  className="dp-input"
                  value={draft[i]}
                  maxLength={200}
                  enterKeyHint="done"
                  onChange={(e) => { const v = e.target.value; setDraft((p) => p.map((x, j) => (j === i ? v : x))); setSaved(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(i) } }}
                />
                <button type="button" className="dp-save" disabled={!dirty} onClick={() => save(i)}>Save</button>
              </div>
              {saved === d.date ? <div className="qo-sub dp-saved" role="status">Saved · syncs to the sheet on next Sync</div> : null}
            </div>
          )
        })}
        <button type="button" className="qo-close" data-dialog-close onClick={onClose}>Done</button>
      </div>
    </>
  )
}
