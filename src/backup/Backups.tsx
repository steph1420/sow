import { useCallback, useEffect, useState } from 'react'
import { useShare } from '../share/ShareContext'
import { autoSaver, noteChange } from '../sync/autoSaveRuntime'
import { diffCount, listSnapshots, restoreSnapshot, snapshotTicksNow, takeSnapshot, type SnapMeta } from './snapshots'
import './backup.css'

const tz = () => (new Date().getTimezoneOffset() === -330 ? 'IST' : '')
const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
export function whenLabel(iso: string, now = new Date()): string {
  const d = new Date(iso)
  const day = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  const y = new Date(now); y.setDate(now.getDate() - 1)
  const head = day(d) === day(now) ? 'Today' : day(d) === day(y) ? 'Yesterday'
    : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')
  return `${head} ${hm(d)}`
}
const n = (x: number) => x.toLocaleString('en-US')
const TAG: Record<SnapMeta['kind'], [string, string]> = { auto: ['Auto', ''], manual: ['Manual', 'manual'], 'before-restore': ['Before restore', 'before'] }

/** Restore: amber confirm with tick counts then/now → Before restore snapshot → phone + sheet → toast with Undo. */
export function useRestore(onRestored?: () => void) {
  const { toast } = useShare()
  const [ask, setAsk] = useState<{ s: SnapMeta; now: number; diff: number } | null>(null)
  const run = useCallback(async (s: SnapMeta, undo = false) => {
    const r = await restoreSnapshot(s.id)
    window.dispatchEvent(new Event('sow:restored'))
    if (r.undone) { noteChange(r.undone); autoSaver.flush() }
    if (undo) { toast('Restore undone'); return }
    const before = (await listSnapshots()).find((x) => x.id === r.beforeId)
    toast(`Restored ${hm(new Date(r.at))} · ${r.undone} tick${r.undone === 1 ? '' : 's'} undone`, {
      ms: 8000,
      action: before ? { label: 'Undo', run: () => void run(before, true) } : undefined,
    })
  }, [toast])
  const askFor = useCallback(async (s: SnapMeta) => setAsk({ s, now: await snapshotTicksNow(), diff: await diffCount(s.id) }), [])
  const sheet = ask ? (
    <>
      <button type="button" className="bk-scrim" aria-label="Cancel" onClick={() => setAsk(null)} />
      <div className="bk-sheet" role="dialog" aria-modal="true" aria-label="Restore snapshot">
        <div className="bk-grab" />
        <h2>Restore {whenLabel(ask.s.at)} {tz()}?</h2>
        <div className="bk-sub">{TAG[ask.s.kind][0]} · {ask.s.reason}</div>
        <div className="bk-stats">
          <div className="bk-stat"><b>{n(ask.s.ticks)}</b><span>ticks then</span></div>
          <div className="bk-stat now"><b>{n(ask.now)}</b><span>ticks now</span></div>
          <div className="bk-stat"><b>{n(ask.s.dates)}</b><span>dates</span></div>
        </div>
        <div className="bk-warn">
          ⚠ <b>{ask.diff ? `${n(ask.diff)} tick${ask.diff === 1 ? '' : 's'} changed after ${hm(new Date(ask.s.at))} will be undone` : `Nothing changed since ${hm(new Date(ask.s.at))}`}</b> on this phone <u>and on the sheet</u>.
          <br />Your current state is saved first as “Before restore”, so you can undo.
        </div>
        <button type="button" className="bk-amber" onClick={() => { const s = ask.s; setAsk(null); onRestored?.(); void run(s) }}>Restore</button>
        <button type="button" className="bk-cancel" onClick={() => setAsk(null)}>Cancel</button>
      </div>
    </>
  ) : null
  return { askFor, sheet }
}

export function BackupsSection({ onRestored }: { onRestored?: () => void } = {}) {
  const { toast } = useShare()
  const [list, setList] = useState<SnapMeta[]>([])
  const [busy, setBusy] = useState(false)
  const { askFor, sheet } = useRestore(onRestored)
  const load = useCallback(() => { void listSnapshots().then(setList).catch(() => {}) }, [])
  useEffect(() => { load(); window.addEventListener('sow:snapshots', load); return () => window.removeEventListener('sow:snapshots', load) }, [load])
  return (
    <section className="bk" aria-label="Backups">
      <div className="more-sec">Backups</div>
      <div className="more-card bk-auto">
        <div className="g-title">Automatic snapshots <span className="bk-on">On</span></div>
        <div className="bk-sub">After each batch of changes, on app open, before every sync or update. Keeps last 50 + one a day for 30 days, on this device.</div>
      </div>
      <button type="button" className="bk-now" disabled={busy} onClick={() => { setBusy(true); void takeSnapshot('manual', 'Back up now').then((s) => toast(s ? `Backed up · ${n(s.ticks)} ticks` : 'Backed up')).finally(() => setBusy(false)) }}>
        Back up now
      </button>
      <div className="more-sec">Snapshots · {list.length}</div>
      <div className="more-card bk-list">
        {list.length ? list.map((s, i) => (
          <div className="bk-row" key={s.id} data-snap={s.id}>
            <div className="bk-body">
              <div className="bk-when">{whenLabel(s.at)} <small>{tz()}</small>{i === 0 ? <span className="bk-tag latest">Latest</span> : null}</div>
              <div className="bk-meta"><span className={`bk-tag ${TAG[s.kind][1]}`}>{TAG[s.kind][0]}</span>{s.reason}</div>
              <div className="bk-meta">{s.classes > 1 ? `${s.classes} classes · ` : ''}{n(s.ticks)} ticks · {s.dates} dates</div>
            </div>
            <button type="button" className="bk-go" onClick={() => void askFor(s)} aria-label={`Restore ${whenLabel(s.at)}`}>Restore ›</button>
          </div>
        )) : <div className="bk-row bk-sub">No snapshots yet.</div>}
      </div>
      {sheet}
    </section>
  )
}

/** ⋮ › Restore snapshot… — the same list in a sheet over the checklist. */
export function RestoreSheet({ onClose }: { onClose: () => void }) {
  return (
    <>
      <button type="button" className="bk-scrim" aria-label="Close" onClick={onClose} />
      <div className="bk-sheet" role="dialog" aria-modal="true" aria-label="Restore snapshot">
        <div className="bk-grab" />
        <BackupsSection onRestored={onClose} />
      </div>
    </>
  )
}
