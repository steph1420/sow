import { useRef, useState, type PointerEvent as RPE } from 'react'
import type { ClassKey } from '../data/types'
import { prettyClassLabel } from '../data/types'
import { useWorkspace } from '../demo/WorkspaceContext'
import { progressForSession } from '../demo/workspaceData'
import { DateEditModal } from '../checklist/chrome/DateEditModal'
import { dm } from '../checklist/chrome/DatePopover'
import { countMarks } from '../dates/sessionEdit'
import { retarget, type Pair } from '../checklist/pickDate'
import { useShare } from '../share/ShareContext'
import { useBackLayer } from '../nav/backStack'
import { haptic } from '../lib/haptics'
import { groupAllDates, isPastDate } from './allDates'
import { fromIso, weekdayShort } from '../dates/dial'

type Props = { classKey: ClassKey; onBack: () => void; onOpenChecklist: () => void }
const todayIsoNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const rowDate = (iso: string) => { const y = fromIso(iso); return `${weekdayShort(y)} ${y.d}/${y.m}` }

/** v0.44.0 (mock overview-v1 dates-list LOCKED): every date for one class, newest first, by month.
 *  Tap a row → that date in the checklist (past dates use the amber LOCKED look). Swipe ← or hold → EDIT (topic only). */
export function AllDatesPage({ classKey, onBack, onOpenChecklist }: Props) {
  const ws = useWorkspace()
  const { toast } = useShare()
  const today = todayIsoNow()
  const map = ws.sessionDatesFor(classKey)
  const groups = groupAllDates([...map.keys()], today)
  const roster = ws.rosterFor(classKey)
  const marks = ws.marksByClass[classKey] ?? {}
  const current = ws.datesFor(classKey).map((d) => d.date) as Pair
  const [armed, setArmed] = useState<string | null>(null)
  const [dem, setDem] = useState<{ mode: 'add' | 'edit'; from?: string } | null>(null)
  const label = prettyClassLabel(classKey)
  useBackLayer(1, onBack)
  const g = useRef<{ iso: string; x: number; y: number; t: number; hold: number | null; swiped: boolean } | null>(null)

  const open = (iso: string) => {
    if (current.includes(iso)) { ws.closePast(false); ws.setActiveClassKey(classKey) }
    else if (isPastDate(iso, current)) ws.openPast(classKey, iso)
    else { ws.closePast(false); ws.setActiveClassKey(classKey); ws.pickDate(classKey, retarget(current, 1, iso)) }
    onOpenChecklist()
  }
  const down = (iso: string) => (e: RPE) => {
    const hold = window.setTimeout(() => { if (g.current) g.current.swiped = true; setArmed(iso); haptic('light') }, 520)
    g.current = { iso, x: e.clientX, y: e.clientY, t: Date.now(), hold, swiped: false }
  }
  const move = (e: RPE) => {
    const s = g.current; if (!s) return
    const dx = e.clientX - s.x, dy = e.clientY - s.y
    if (Math.abs(dy) > 12 && s.hold) { clearTimeout(s.hold); s.hold = null }
    if (dx < -48 && Math.abs(dy) < 30 && !s.swiped) { s.swiped = true; if (s.hold) clearTimeout(s.hold); setArmed(s.iso); haptic('light') }
  }
  const up = (iso: string) => () => {
    const s = g.current; g.current = null
    if (!s) return
    if (s.hold) clearTimeout(s.hold)
    if (s.swiped) return
    if (armed === iso) { setDem({ mode: 'edit', from: iso }); setArmed(null); return }
    if (armed) { setArmed(null); return }
    open(iso)
  }
  const n = map.size

  return (
    <div className="ad-page" data-testid="all-dates">
      <div className="ad-head">
        <button type="button" className="ad-back" aria-label="Back to Overview" onClick={onBack}>‹</button>
        <div className="ad-ht">
          <div className="ad-title">{label} · All dates</div>
          <div className="ad-sub">{n} date{n === 1 ? '' : 's'} · newest first · tap a date to open it</div>
        </div>
      </div>
      {groups.map((grp) => (
        <section key={grp.label} className="ad-month">
          <div className="ad-mh">{grp.label.toUpperCase()}</div>
          {grp.rows.map((r) => {
            const p = progressForSession(marks, roster, r.iso)
            const topic = map.get(r.iso) ?? ''
            return (
              <div key={r.iso} className={`ad-row${armed === r.iso ? ' armed' : ''}${r.upcoming ? ' up' : ''}`} data-iso={r.iso}
                onPointerDown={down(r.iso)} onPointerMove={move} onPointerUp={up(r.iso)} onPointerCancel={() => { const s = g.current; if (s && s.hold && Date.now() - s.t < 400) { clearTimeout(s.hold) } g.current = null }}
                onContextMenu={(e) => e.preventDefault()} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') open(r.iso); if (e.key === 'e') setDem({ mode: 'edit', from: r.iso }) }}>
                <div className="ad-d">{rowDate(r.iso)}</div>
                {armed === r.iso ? (
                  <button type="button" className="ad-edit" onPointerDown={(e) => { if (armed === r.iso) e.stopPropagation() }} onPointerUp={(e) => { if (g.current?.swiped) return; e.stopPropagation(); if (g.current?.hold) clearTimeout(g.current.hold); g.current = null; setArmed(null); setDem({ mode: 'edit', from: r.iso }) }}>
                    <b>✎ EDIT</b><span>topic · date · delete</span>
                  </button>
                ) : (
                  <div className="ad-mid">
                    <div className="ad-tp">{topic ? <span>{topic}</span> : <i>No topic</i>}{r.upcoming ? <span className="ad-up">UPCOMING</span> : null}</div>
                    <div className="ad-bar"><i style={{ width: `${p.pct}%` }} /></div>
                  </div>
                )}
                {armed === r.iso ? null : <div className="ad-n">{p.set}/{p.total}</div>}
                {armed === r.iso ? null : <div className="ad-chev" aria-hidden>›</div>}
              </div>
            )
          })}
        </section>
      ))}
      <div className="ad-foot">
        <button type="button" className="ad-add" onClick={() => setDem({ mode: 'add' })}>+ Add Date</button>
        <div className="ad-hint">Swipe ← on a row to edit</div>
      </div>
      {dem ? (
        <DateEditModal mode={dem.mode} classLabel={label} sessions={map} from={dem.from} today={today}
          markCount={dem.from ? countMarks(marks, dem.from) : 0}
          onClose={() => setDem(null)}
          onSave={(items) => {
            if (dem.mode === 'add') { for (const it of items) ws.addSession(classKey, it.iso, it.topic); toast(items.length > 1 ? `${items.length} dates added · syncs on next Sync` : `Added ${dm(items[0]!.iso)} · syncs on next Sync`) }
            else if (dem.from) { const it = items[0]!; ws.moveSession(classKey, dem.from, it.iso, it.topic); toast(it.iso !== dem.from ? `Moved ${dm(dem.from)} → ${dm(it.iso)}` : 'Saved') }
            haptic('success'); setDem(null)
          }}
          onDelete={() => {
            if (!dem.from) return
            const snap = ws.deleteSession(classKey, dem.from); setDem(null); haptic('heavy')
            toast(`Deleted ${dm(snap.date)}`, { action: { label: 'Undo', run: () => { ws.restoreSession(snap); toast(`Restored ${dm(snap.date)}`) } } })
          }} />
      ) : null}
    </div>
  )
}
