import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react'
import { fromIso, weekdayShort } from '../../dates/dial'

/** v0.43.0 (t18u/t25u–t27u/t33u LOCKED): tap the date header → plain list of sessions (oldest first).
 *  Tap a row = show it in this column. Long-press OR swipe left = edit; on swipe the EDIT tab covers only the topic.
 *  Bottom: "Add Date" pill. 1|2 date view (this device only). */
type Props = {
  classLabel: string
  sessions: Map<string, string>
  shown: string[]
  current: string
  cols: 1 | 2
  onCols: (n: 1 | 2) => void
  onPick: (iso: string) => void
  onEdit: (iso: string) => void
  onAdd: () => void
  onClose: () => void
  top?: number
}
const HOLD_MS = 480, SWIPE_PX = 36
export const dm = (iso: string) => { const y = fromIso(iso); return `${y.d}/${y.m}` }
export const wd = (iso: string) => weekdayShort(fromIso(iso))

export function DatePopover({ classLabel, sessions, shown, current, cols, onCols, onPick, onEdit, onAdd, onClose, top }: Props) {
  const rows = [...sessions.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const [swiped, setSwiped] = useState<string | null>(null)
  const g = useRef<{ iso: string; x: number; y: number; t: number | null; moved: boolean; done: boolean } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => { listRef.current?.querySelector('.dpo-row.cur')?.scrollIntoView({ block: 'nearest' }) }, [])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const end = () => { const s = g.current; if (s?.t) window.clearTimeout(s.t) }
  const down = (e: RPE, iso: string) => {
    end()
    const s = { iso, x: e.clientX, y: e.clientY, t: null as number | null, moved: false, done: false }
    s.t = window.setTimeout(() => { if (!s.moved) { s.done = true; onEdit(iso) } }, HOLD_MS)
    g.current = s
  }
  const move = (e: RPE) => {
    const s = g.current; if (!s || s.done) return
    const dx = e.clientX - s.x, dy = e.clientY - s.y
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { s.moved = true; s.done = true; end(); return } // vertical = scroll
    if (Math.abs(dx) > 8) { s.moved = true; end() }
    if (dx < -SWIPE_PX) { s.done = true; setSwiped(s.iso) }
    else if (dx > SWIPE_PX && swiped === s.iso) { s.done = true; setSwiped(null) }
  }
  const up = (iso: string) => {
    const s = g.current; end(); g.current = null
    if (!s || s.done || s.moved) return
    if (swiped) { setSwiped(null); return }
    onPick(iso)
  }
  return (
    <>
      <button type="button" className="dpo-scrim" aria-label="Close dates" onClick={onClose} />
      <div className="dpo" style={top ? { top } : undefined} role="dialog" aria-label={`${classLabel} dates`}>
        <div className="dpo-head">
          <span>{classLabel} · Dates</span>
          <span className="dpo-cols" role="group" aria-label="Dates shown (this device)">
            {([1, 2] as const).map((n) => (
              <button type="button" key={n} className={cols === n ? 'on' : ''} aria-pressed={cols === n} onClick={() => onCols(n)}>{n}</button>
            ))}
          </span>
        </div>
        <div className="dpo-list" ref={listRef} role="listbox" aria-label="Sessions">
          {rows.length ? null : <div className="dpo-empty">No dates yet</div>}
          {rows.map(([iso, topic]) => {
            const on = iso === current, vis = shown.includes(iso)
            return (
              <div
                key={iso}
                className={`dpo-row${on ? ' cur' : ''}${vis ? ' vis' : ''}${swiped === iso ? ' swiped' : ''}`}
                data-iso={iso}
                role="option"
                aria-selected={on}
                tabIndex={0}
                onPointerDown={(e) => down(e, iso)}
                onPointerMove={move}
                onPointerUp={() => up(iso)}
                onPointerCancel={() => { end(); g.current = null }}
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => { if (e.key === 'Enter') onPick(iso); else if (e.key === 'F2' || e.key === 'e') onEdit(iso) }}
              >
                <span className="dpo-date">{dm(iso)} {wd(iso)}{on ? ' ✓' : ''}</span>
                <span className="dpo-topic">
                  <span className="dpo-tt">{topic || 'No topic'}</span>
                  <button type="button" className="dpo-edit" tabIndex={swiped === iso ? 0 : -1} aria-label={`Edit ${dm(iso)}`}
                    onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}
                    onClick={() => onEdit(iso)}>✎ EDIT</button>
                </span>
              </div>
            )
          })}
        </div>
        <div className="dpo-hint">Tap = open · hold or swipe ← = edit</div>
        <button type="button" className="dpo-add" onClick={onAdd}>＋ Add Date</button>
      </div>
    </>
  )
}
