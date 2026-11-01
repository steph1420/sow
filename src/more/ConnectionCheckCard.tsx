import { useState } from 'react'
import { getSettings } from '../data'
import { checkConnection, type Connection } from '../sync/connectionCheck'

/** v0.46.0: one tap → which sheet (TEST copy / LIVE, by sheet id) and which bridge version this phone syncs with. */
export function ConnectionCheckCard() {
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Connection | null>(null)
  const [err, setErr] = useState('')
  const run = async () => {
    setBusy(true); setErr(''); setRes(null)
    try {
      const s = await getSettings()
      if (!s.syncUrl.trim() || !s.bridgeToken?.trim()) throw new Error('No bridge URL or token on this device yet')
      setRes(await checkConnection(s.syncUrl.trim(), s.bridgeToken.trim(), s.sheetUrl))
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <section className="sy-card conn-card" aria-label="Connection check">
      <button type="button" className="more-row conn-check" onClick={() => void run()} disabled={busy}>
        {busy ? 'Checking…' : 'Check connection'}
      </button>
      {res ? (
        <div className="more-hint conn-result" role="status" data-label={res.label} data-version={res.version}>
          Sheet: <b>{res.label}</b> · bridge {res.version}{res.note ? <><br />{res.note}</> : null}
        </div>
      ) : null}
      {err ? <div className="more-hint conn-error" role="alert" style={{ color: 'var(--warn)' }}>{err}</div> : null}
    </section>
  )
}
