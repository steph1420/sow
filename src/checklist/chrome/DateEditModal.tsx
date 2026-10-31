import { useState } from 'react'
import { DatePicker } from './DatePicker'
import { fromIso, MONTHS, weekdayShort } from '../../dates/dial'
import { clashFor } from '../../dates/sessionEdit'
import { dm, wd } from './DatePopover'

/** v0.43.0 (t29u/t31u/t32u LOCKED): centred popup over a dim backdrop; tap outside cancels.
 *  Add: squircles (starts with today), ＋ right of the last adds one; focused card is edited; topic; dials; ✓ saves all.
 *  Edit: the date big at top, topic, dials; ✓ save, 🗑 delete (with a marks warning + Undo). */
type Item = { iso: string; topic: string }
type Props = {
  mode: 'add' | 'edit'
  classLabel: string
  sessions: Map<string, string>
  /** edit: the session being edited */
  from?: string
  today: string
  markCount?: number
  onSave: (items: Item[]) => void
  onDelete?: () => void
  onClose: () => void
}
const long = (iso: string) => { const y = fromIso(iso); return `${weekdayShort(y)} ${y.d} ${MONTHS[y.m - 1]} ${y.y}` }

export function DateEditModal({ mode, classLabel, sessions, from, today, markCount = 0, onSave, onDelete, onClose }: Props) {
  const [items, setItems] = useState<Item[]>(() => mode === 'edit' && from ? [{ iso: from, topic: sessions.get(from) ?? '' }] : [{ iso: today, topic: '' }])
  const [focus, setFocus] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const cur = items[focus]!
  const upd = (p: Partial<Item>) => setItems((xs) => xs.map((x, i) => (i === focus ? { ...x, ...p } : x)))
  const problem = (it: Item, i: number): string | null => {
    const c = clashFor(sessions, mode === 'edit' ? from ?? null : null, it.iso)
    if (c !== null) return `${dm(it.iso)} already has ${c ? `“${c}”` : 'a session'}`
    if (items.some((o, j) => j !== i && o.iso === it.iso)) return `${dm(it.iso)} is picked twice`
    return null
  }
  const errs = items.map(problem)
  const err = errs[focus] ?? errs.find(Boolean) ?? null
  const save = () => { if (!err) onSave(items.map((x) => ({ iso: x.iso, topic: x.topic.trim() }))) }
  const addCard = () => {
    const last = items[items.length - 1]!.iso
    const d = new Date(last + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)
    setItems((xs) => [...xs, { iso: d.toISOString().slice(0, 10), topic: '' }]); setFocus(items.length)
  }
  return (
    <>
      <button type="button" className="dem-scrim" aria-label="Cancel" onClick={onClose} />
      <div className="dem" role="dialog" aria-modal="true" aria-label={mode === 'add' ? 'Add dates' : 'Edit date'}>
        <div className="dem-head">
          <span className="dem-k">{mode === 'add' ? 'Add dates' : 'Edit date'} · {classLabel}</span>
          {mode === 'edit' ? <button type="button" className="dem-del" aria-label="Delete this date" onClick={() => setConfirm(true)}>🗑</button> : null}
          <button type="button" className="dem-ok" aria-label="Save" disabled={!!err} onClick={save}>✓</button>
        </div>
        {mode === 'add' ? (
          <div className="dem-slots" role="group" aria-label="Dates to add">
            {items.map((x, i) => (
              <button type="button" key={i} className={`dp-slot dem-slot${i === focus ? ' on' : ''}${errs[i] ? ' bad' : ''}`} aria-pressed={i === focus} onClick={() => setFocus(i)}>
                <span className="k">Date {i + 1}</span>
                <span className="d">{wd(x.iso)}<br />{dm(x.iso)}</span>
                <span className="t">{x.topic || 'No topic'}</span>
              </button>
            ))}
            <button type="button" className="dem-plus" aria-label="Add another date" onClick={addCard}>＋</button>
          </div>
        ) : (
          <div className="dem-big" aria-live="polite">{long(cur.iso)}{from && cur.iso !== from ? <span className="dem-was"> (was {dm(from)} · marks move)</span> : null}</div>
        )}
        <input className="dp-input dem-topic" aria-label={`Topic for ${dm(cur.iso)}`} placeholder="Topic" value={cur.topic} maxLength={200}
          enterKeyHint="done" onChange={(e) => upd({ topic: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
        <DatePicker key={focus} compact start={cur.iso} sessions={sessions} onChange={(iso) => upd({ iso })} onEnter={save} />
        <div className={`dem-note${err ? ' bad' : ''}`} role="status">{err ? `${err} — pick another date` : mode === 'add' && items.length > 1 ? `✓ saves all ${items.length} dates · tap outside to cancel` : '✓ saves · tap outside to cancel'}</div>
        {confirm ? (
          <div className="dem-confirm" role="alertdialog" aria-label="Confirm delete">
            <p>Delete {dm(from!)} {wd(from!)}? <b>{markCount} mark{markCount === 1 ? '' : 's'} will be deleted.</b> You can undo.</p>
            <div><button type="button" onClick={() => setConfirm(false)}>Cancel</button><button type="button" className="danger" onClick={() => onDelete?.()}>Delete</button></div>
          </div>
        ) : null}
      </div>
    </>
  )
}
