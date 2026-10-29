import { useCallback, useEffect, useRef, useState } from 'react'
import { haptic } from '../lib/haptics'
import { getSettings } from '../data/api'
import { loadPrefSyncState, PREFSYNC_STATE_EVENT, runPrefsSync, savePrefSyncState, UPDATE_BRIDGE_MSG } from '../sync/prefsRunner'
import { CATEGORIES, type CatId, type PrefSyncState } from '../sync/prefsSync'

const fmt = (iso?: string) => {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return isNaN(+d) ? 'Never' : d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '')
}

/** v0.36.0 (t52u, mock prefsync-mj1-a): Sync settings across devices. */
export function PrefsSyncCard({ online, refreshKey }: { online: boolean; refreshKey?: unknown }) {
  // Paired = URL + token SAVED on this device (not what is being typed in the field).
  const [paired, setPaired] = useState(false)
  useEffect(() => {
    let live = true
    void getSettings().then((s) => { if (live) setPaired(!!s.syncUrl.trim() && !!s.bridgeToken?.trim()) })
    return () => { live = false }
  }, [refreshKey])
  const [st, setSt] = useState<PrefSyncState>(() => loadPrefSyncState())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [choice, setChoice] = useState(false)
  const auto = useRef(false)
  useEffect(() => {
    const f = () => setSt(loadPrefSyncState())
    window.addEventListener(PREFSYNC_STATE_EVENT, f)
    return () => window.removeEventListener(PREFSYNC_STATE_EVENT, f)
  }, [])
  const run = useCallback(async (mode: 'auto' | 'synced' | 'local') => {
    setBusy(true); setMsg('')
    try {
      const r = await runPrefsSync(mode)
      if (r.status === 'needs-choice') setChoice(true)
      else { setChoice(false); setMsg(r.message); haptic(r.status === 'ok' ? 'success' : 'error') }
    } finally { setBusy(false); setSt(loadPrefSyncState()) }
  }, [])
  // First visit after pairing: ask which settings to use.
  useEffect(() => {
    if (auto.current || !paired || !online) return
    const s = loadPrefSyncState()
    if (s.enabled && !s.chosen) { auto.current = true; void run('auto') }
  }, [paired, online, run])

  const save = (next: PrefSyncState) => { savePrefSyncState(next); setSt(next) }
  const setCat = (id: CatId) => save({ ...st, cats: { ...st.cats, [id]: !st.cats[id] } })
  const old = st.bridge === 'old'

  return (
    <>
      <div className="more-sec">Sync settings across devices</div>
      <div className="more-card prefsync-card">
        <button type="button" className="more-row more-row-stack" role="switch" aria-checked={st.enabled} onClick={() => save({ ...st, enabled: !st.enabled })}>
          <span className="more-row-main"><b>Sync settings</b><span className={`toggle${st.enabled ? ' on' : ''}`} aria-hidden /></span>
          <span className="more-row-sub">Paired devices share the choices below · via your sheet bridge</span>
        </button>
        {CATEGORIES.map((c) =>
          c.always ? (
            <div key={c.id} className="more-row more-row-stack" style={{ cursor: 'default', opacity: st.enabled ? 1 : 0.45 }}>
              <span className="more-row-main">{c.label}<span className="meta">Always synced</span></span>
              <span className="more-row-sub">Year start month · needed for sheet dates</span>
            </div>
          ) : (
            <button key={c.id} type="button" className="more-row more-row-stack" role="switch" aria-checked={!!st.cats[c.id]} aria-label={c.label} disabled={!st.enabled} style={{ opacity: st.enabled ? 1 : 0.45 }} onClick={() => setCat(c.id)}>
              <span className="more-row-main">{c.label}<span className={`toggle${st.cats[c.id] ? ' on' : ''}`} aria-hidden /></span>
              <span className="more-row-sub">{c.sub}</span>
            </button>
          ),
        )}
        {old ? <div className="more-hint" role="alert" style={{ color: 'var(--warn)', margin: '10px 14px 0' }}>{UPDATE_BRIDGE_MSG}</div> : null}
        <div className="sp-row-btn">
          <button type="button" className="sp-btn pri" disabled={busy || !online || !paired || !st.enabled} onClick={() => void run('auto')}>{busy ? 'Syncing…' : 'Sync settings now'}</button>
        </div>
        <div className="sp-sm" style={{ textAlign: 'center' }} role="status">
          {!paired ? 'Pair this device to sync settings' : msg && !old ? msg + ' · ' : ''}{paired ? `Last synced ${fmt(st.lastSyncAt)}` : ''}
        </div>
      </div>
      <div className="more-sec">Never synced · this device only</div>
      <div className="more-card">
        <div className="more-row more-row-stack" style={{ cursor: 'default' }}>
          <span className="more-row-main">Bridge token, sheet + bridge URL</span>
          <span className="more-row-sub">Comes with pairing</span>
        </div>
        <div className="more-row more-row-stack" style={{ cursor: 'default' }}>
          <span className="more-row-main">Haptics, reduce motion</span>
          <span className="more-row-sub">Depends on the phone</span>
        </div>
      </div>
      {choice ? <PrefsChoiceSheet busy={busy} onPick={(m) => void run(m)} onLater={() => { setChoice(false); save({ ...loadPrefSyncState(), enabled: false }) }} /> : null}
    </>
  )
}

/** v0.36.0 (mock prefsync-mj1-b): first join — default "Use synced settings" (t52u lock 5). */
export function PrefsChoiceSheet({ busy, onPick, onLater }: { busy: boolean; onPick: (m: 'synced' | 'local') => void; onLater: () => void }) {
  const [pick, setPick] = useState<'synced' | 'local'>('synced')
  return (
    <div className="sp-scrim">
      <div className="sp-sheet" role="dialog" aria-modal="true" aria-label="Which settings?">
        <div className="sp-grab" />
        <div className="sp-title">Paired ✓ · Which settings?</div>
        <div className="more-hint" style={{ margin: '0 16px 10px' }}>Your other device has synced settings. Marks sync either way.</div>
        <div className="more-card" style={{ margin: '0 12px' }} role="radiogroup">
          <button type="button" role="radio" aria-checked={pick === 'synced'} className="more-row more-row-stack" onClick={() => setPick('synced')}>
            <span className="more-row-main">Use synced settings<span className="meta" style={{ color: pick === 'synced' ? 'var(--ok)' : undefined }}>{pick === 'synced' ? '●' : '○'}</span></span>
            <span className="more-row-sub">Take theme, gestures, templates… from the sheet</span>
          </button>
          <button type="button" role="radio" aria-checked={pick === 'local'} className="more-row more-row-stack" onClick={() => setPick('local')}>
            <span className="more-row-main">Use this device's settings<span className="meta" style={{ color: pick === 'local' ? 'var(--ok)' : undefined }}>{pick === 'local' ? '●' : '○'}</span></span>
            <span className="more-row-sub">Replaces the synced ones on all devices</span>
          </button>
        </div>
        <div className="sp-sm" style={{ textAlign: 'center', paddingTop: 10 }}>Change later in Sync › Sync settings</div>
        <div className="sp-row-btn" style={{ paddingTop: 6 }}>
          <button type="button" className="sp-btn" disabled={busy} onClick={onLater}>Not now</button>
          <button type="button" className="sp-btn pri" disabled={busy} onClick={() => onPick(pick)}>{busy ? 'Syncing…' : 'Continue'}</button>
        </div>
      </div>
    </div>
  )
}
