import { useEffect, useState } from 'react'
import { autoSaver, useAutoSaveState } from '../sync/autoSaveRuntime'
import './backup.css'

/** v0.45.0 (LOCKED v042-safety/autosave.cjs): hidden at rest · ring ~1 s → tick fades · dim cloud + count
 *  offline · amber tap-to-retry on error · reduce motion = tick fade only. Sits left of Undo. */
export function AutoSaveIcon() {
  const st = useAutoSaveState()
  // show the ring at least ~1 s so a fast save still reads as "saving → saved"
  const [shown, setShown] = useState(st.status)
  useEffect(() => {
    if (st.status === 'saving') { setShown('saving'); return }
    if (st.status === 'saved' && shown === 'saving') { const t = setTimeout(() => setShown('saved'), 700); return () => clearTimeout(t) }
    setShown(st.status)
  }, [st.status]) // eslint-disable-line react-hooks/exhaustive-deps
  if (shown === 'idle') return <span className="as as-rest" aria-hidden data-state="idle" />
  if (shown === 'saving') return (
    <span className="as as-saving" role="status" aria-label="Saving…" data-state="saving">
      <svg viewBox="0 0 18 18"><circle className="trk" cx="9" cy="9" r="7.5" /><circle className="ring" cx="9" cy="9" r="7.5" /></svg>
    </span>
  )
  if (shown === 'saved') return (
    <span className="as as-saved" role="status" aria-label="Saved" data-state="saved">
      <svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="7.5" fill="none" stroke="var(--accent)" strokeWidth="2" opacity=".35" /><path className="tk" d="M5.3 9.3 L8 11.8 L12.8 6.4" /></svg>
    </span>
  )
  if (shown === 'queued') return (
    <span className="as as-off" role="status" aria-label={`Offline · ${st.pending} waiting · saves when back online`} data-state="queued">
      <svg viewBox="0 0 18 18"><path d="M5 13.5h8.2a3 3 0 0 0 .3-6 4.2 4.2 0 0 0-8-.6A3.3 3.3 0 0 0 5 13.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      {st.pending ? <span className="cnt">{st.pending > 99 ? '99+' : st.pending}</span> : null}
    </span>
  )
  return (
    <button type="button" className="as fail" aria-label="Not saved · tap to retry" title={st.error} data-state="error" onClick={() => autoSaver.retry()}>
      <svg viewBox="0 0 18 18"><path d="M14.5 6.5A6 6 0 1 0 15 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M15 3.5v3.3h-3.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="9" cy="9.2" r="1.3" fill="currentColor" /></svg>
    </button>
  )
}
