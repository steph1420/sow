import { useState } from 'react'
import { DatePicker } from './DatePicker'
import { fromIso, MONTHS, weekdayShort } from '../../dates/dial'
import { reorderNote, retarget, type Pair } from '../pickDate'
import type { DateSlot } from '../types'

type Props = {
  classLabel: string
  dates: [DateSlot, DateSlot]
  pills: [boolean, boolean]
  onView: (pills: [boolean, boolean]) => void
  onClose: () => void
  sessions: Map<string, string>
  picked: boolean
  /** Save the targeted slot: adds a session if the date has none, else updates its topic; returns nothing. */
  onSave: (pair: Pair, iso: string, topic: string, isNew: boolean) => void
  onReset: () => void
}

const label = (iso: string) => { const y = fromIso(iso); return `${weekdayShort(y)} ${y.d} ${MONTHS[y.m - 1]}` }

/** v0.42.0 (t5u Q-DATES-A LOCKED, mock dates-v1/A-slot-chips): Date 1 / Date 2 cards (oldest left) — tap one to target it;
 *  the Year dropdown + Month / Date / Day dials edit only that slot; one topic box; one primary "Save Date N". */
export function DatePanelSheet({ classLabel, dates, pills, onView, onClose, sessions, picked, onSave, onReset }: Props) {
  const pair: Pair = [dates[0].date, dates[1].date]
  const single = pair[0] === pair[1]
  const [target, setTarget] = useState<0 | 1>(single ? 0 : 1)
  const [sel, setSel] = useState(pair[target])
  const [draft, setDraft] = useState(sessions.get(pair[target]) ?? '')
  const [saved, setSaved] = useState(false)
  const choose = (i: 0 | 1) => { setTarget(i); const iso = single && i === 1 ? pair[0] : pair[i]; setSel(iso); setDraft(sessions.get(iso) ?? ''); setSaved(false) }
  const has = sessions.has(sel)
  const cur = single && target === 1 ? '' : pair[target]
  const dirty = sel !== cur || (draft.trim() !== (sessions.get(sel) ?? '') && (!has || !!draft.trim()))
  const note = reorderNote(pair, target, sel)
  const save = () => {
    if (!dirty) return
    const next = retarget(pair, target, sel)
    onSave(next, sel, draft, !has)
    const t = next[0] === next[1] ? 0 : next.indexOf(sel) as 0 | 1
    setTarget(t); setSaved(true)
  }
  const two = pills[0] && pills[1] && !single
  const card = (i: 0 | 1) => {
    const none = single && i === 1
    const d = dates[i]
    return (
      <button type="button" key={i} className={`dp-slot${target === i ? ' on' : ''}`} aria-pressed={target === i} onClick={() => choose(i)}>
        <span className="k">Date {i + 1}{target === i ? ' · Editing' : ''}</span>
        <span className="d">{none ? 'None' : label(d.date)}</span>
        <span className="t">{none ? 'Tap to add a second date' : d.topic || 'No topic'}</span>
      </button>
    )
  }
  return (
    <>
      <button type="button" className="qo-scrim dp-scrim" aria-label="Dismiss dates" onClick={onClose} />
      <div className="qo-sheet dp-sheet" role="dialog" aria-modal="true" aria-label="Dates and topics">
        <div className="qo-handle" aria-hidden />
        <div className="qo-head">
          <h2>Dates</h2>
          <span className="qo-class">{classLabel}</span>
        </div>
        <div className="dp-slots" role="group" aria-label="Which date to change">{card(0)}{card(1)}</div>
        <div className="dp-hint">Tap a date to change it. The dials below edit <b>Date {target + 1}</b>.</div>
        <DatePicker
          key={`${target}|${pair.join()}`}
          start={sel}
          sessions={sessions}
          onChange={(iso) => { setSel(iso); setDraft(sessions.get(iso) ?? ''); setSaved(false) }}
          onEnter={(iso) => { setSel(iso); save() }}
        />
        <input
          className="dp-input dp-topic"
          aria-label={`Topic for Date ${target + 1}`}
          placeholder={has ? 'Topic' : 'Topic (optional)'}
          value={draft}
          maxLength={200}
          enterKeyHint="done"
          onChange={(e) => { setDraft(e.target.value); setSaved(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
        />
        <div className="dp-note" aria-live="polite">
          {note ? <b className="dp-warn">{note} · dates stay oldest first. </b> : null}
          ● session on the sheet · {label(sel)} {has ? 'has a session' : 'has no session — Save adds one'}
        </div>
        {saved ? <div className="qo-sub dp-saved" role="status">Saved · syncs to the sheet on next Sync</div> : null}
        <div className="dp-row2">
          {single ? null : two ? (
            <button type="button" className="dp-one" onClick={() => onView(target === 0 ? [true, false] : [false, true])}>1 date only</button>
          ) : (
            <button type="button" className="dp-one" onClick={() => onView([true, true])}>2 dates</button>
          )}
          <button type="button" className="p dp-save-main" disabled={!dirty} onClick={save}>Save Date {target + 1}</button>
        </div>
        {picked ? <button type="button" className="dp-reset" onClick={onReset}>Back to sheet dates</button> : null}
        <button type="button" className="qo-close" data-dialog-close onClick={onClose}>Done</button>
      </div>
    </>
  )
}
