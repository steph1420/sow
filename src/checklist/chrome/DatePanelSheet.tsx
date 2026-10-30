import { useRef, useState } from 'react'
import { DatePicker } from './DatePicker'
import { fromIso, MONTHS, weekdayShort } from '../../dates/dial'
import type { DateSlot } from '../types'

type Props = {
  classLabel: string
  dates: [DateSlot, DateSlot]
  pills: [boolean, boolean]
  onView: (pills: [boolean, boolean]) => void
  onSaveTopic: (date: string, topic: string) => void
  onClose: () => void
  /** v0.41.0 any-date picker */
  sessions: Map<string, string>
  picked: boolean
  onPick: (iso: string) => void
  onAddSession: (iso: string, topic: string) => void
  onReset: () => void
}

/** v0.40.0 (t83u) Date panel — pick 1 or 2 dates and view / edit each session's topic. Opened from the header dates. */
export function DatePanelSheet({ classLabel, dates, pills, onView, onSaveTopic, onClose, sessions, picked, onPick, onAddSession, onReset }: Props) {
  const [sel, setSel] = useState(dates[1].date)
  const [newTopic, setNewTopic] = useState('')
  const addRef = useRef<HTMLInputElement>(null)
  const ymd = fromIso(sel)
  const selLabel = `${weekdayShort(ymd)} ${ymd.d} ${MONTHS[ymd.m - 1]}`
  const selHas = sessions.has(sel)
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
        <h3 className="dp-sub">Pick a date</h3>
        <DatePicker
          start={dates[1].date}
          sessions={sessions}
          onChange={(iso) => { setSel(iso); setNewTopic('') }}
          onEnter={(iso) => { setSel(iso); if (sessions.has(iso)) onPick(iso); else addRef.current?.focus() }}
        />
        <div className="dp-pick-card" aria-live="polite">
          {selHas ? (
            <>
              <div className="t">{selLabel} · session</div>
              <div className="s">{sessions.get(sel) || 'No topic'}</div>
              <div className="dp-row2">
                <button type="button" className="p" onClick={() => onPick(sel)} disabled={sel === dates[0].date || sel === dates[1].date}>
                  {sel === dates[0].date || sel === dates[1].date ? 'Already shown' : 'Open this date'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="t">{selLabel} · no session</div>
              <div className="s">Nothing was set on this date. Add one so you can tick it?</div>
              <input ref={addRef} className="dp-input dp-add-topic" placeholder="Topic (optional)" maxLength={200} value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddSession(sel, newTopic) } }} />
              <div className="dp-row2">
                <button type="button" onClick={() => { setSel(dates[1].date) }}>Cancel</button>
                <button type="button" className="p" onClick={() => onAddSession(sel, newTopic)}>Add session</button>
              </div>
            </>
          )}
          <div className="s dp-note">{two ? 'Replaces date 2' : 'Shown on its own'} · dates stay oldest first</div>
        </div>
        {picked ? <button type="button" className="dp-reset" onClick={onReset}>Back to sheet dates</button> : null}
        <button type="button" className="qo-close" data-dialog-close onClick={onClose}>Done</button>
      </div>
    </>
  )
}
