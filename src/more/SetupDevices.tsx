/** v0.34.0 Other devices: Pair a device · Join with a code · Setup file (setuppair-mj1 LOCKED t39u). */
import { useEffect, useRef, useState } from 'react'
import { APP_VERSION } from '../lib/appVersion'
import {
  buildSetupFile, fmtCountdown, maskToken, pairCancel, pairClaim, pairStart, pingBridge,
  SETUP_FILENAME, type SetupData,
} from '../sync/setupPair'
import { MoreChrome } from './MoreChrome'

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function OtherDevicesCard(p: {
  canHost: boolean
  onPair: () => void
  onJoin: () => void
  onExport: () => void
  onImportFile: (text: string) => void
}) {
  const file = useRef<HTMLInputElement>(null)
  return (
    <>
      <div className="more-sec">Other devices</div>
      <div className="more-card">
        <button type="button" className="more-row more-row-stack" style={{ width: '100%', textAlign: 'left' }} onClick={p.onPair} disabled={!p.canHost}>
          <div className="more-row-main">Pair a device<span className="chev">›</span></div>
          <div className="more-row-sub">{p.canHost ? 'Show a 6-digit code · enter it on the new device' : 'Needs the sync URL and token first'}</div>
        </button>
        <button type="button" className="more-row more-row-stack" style={{ width: '100%', textAlign: 'left' }} onClick={p.onJoin}>
          <div className="more-row-main">Join with a code<span className="chev">›</span></div>
          <div className="more-row-sub">This is the new device</div>
        </button>
        <div className="more-row more-row-stack" style={{ cursor: 'default' }}>
          <div className="more-row-main">Setup file<span className="meta">.sowsetup</span></div>
          <div className="more-row-sub">URL + token in one file · keep it private</div>
        </div>
        <div className="sp-row-btn">
          <button type="button" className="sp-btn" onClick={p.onExport} disabled={!p.canHost}>Export</button>
          <button type="button" className="sp-btn" onClick={() => file.current?.click()}>Import</button>
          <input
            ref={file}
            type="file"
            accept=".sowsetup,application/json,text/plain"
            hidden
            data-testid="setup-file"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) p.onImportFile(await f.text())
            }}
          />
        </div>
      </div>
    </>
  )
}

/** Share sheet where it can share files, else a download. Returns what happened. */
export async function exportSetup(s: { syncUrl: string; token: string; sheetUrl: string }): Promise<string> {
  const text = buildSetupFile(s, new Date().toISOString(), APP_VERSION)
  const file = new File([text], SETUP_FILENAME, { type: 'application/json' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: 'SoW setup' })
      return 'Shared setup file · it holds your token, keep it private'
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return ''
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = SETUP_FILENAME
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  return 'Saved sow-setup.sowsetup · it holds your token, keep it private'
}

export function PairHostPage(p: { url: string; token: string; onBack: () => void }) {
  const [code, setCode] = useState('')
  const [exp, setExp] = useState(0)
  const [ttl, setTtl] = useState(300)
  const [now, setNow] = useState(Date.now())
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const start = async () => {
    setBusy(true); setErr('')
    try {
      const r = await pairStart(p.url, p.token)
      setCode(r.code); setTtl(r.expiresInSec); setExp(Date.now() + r.expiresInSec * 1000); setNow(Date.now())
    } catch (e) { setErr(msg(e)) } finally { setBusy(false) }
  }
  useEffect(() => { void start() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!exp) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [exp])
  const left = exp ? (exp - now) / 1000 : 0
  const expired = !!code && left <= 0
  const cancel = () => { if (code && !expired) void pairCancel(p.url, p.token); p.onBack() }
  return (
    <MoreChrome title="Pair a device" onBack={cancel}>
      <div className="more-hint">On the new device: Sync › Join with a code</div>
      <div className="more-card" style={{ padding: 0 }}>
        <div className="sp-code" data-testid="pair-code" aria-label={code ? `Code ${code.split('').join(' ')}` : 'Making code'}>
          {code ? (expired ? '––– –––' : `${code.slice(0, 3)} ${code.slice(3)}`) : busy ? '··· ···' : '––– –––'}
        </div>
        <div className="sp-cd" role="timer" aria-live="off">{fmtCountdown(code ? left : 0)}</div>
        <div className="sp-bar"><i style={{ width: `${code ? Math.max(0, Math.min(100, (left / ttl) * 100)) : 0}%` }} /></div>
        <div className="sp-sm">{expired ? 'Code expired' : 'One use · expires in 5 min'}</div>
      </div>
      {err ? <div className="more-hint" style={{ color: 'var(--warn)' }}>{err}</div> : null}
      <div className="sp-row-btn" style={{ padding: '10px 0' }}>
        {expired || err ? <button type="button" className="sp-btn pri" onClick={() => void start()} disabled={busy}>New code</button> : null}
        <button type="button" className="sp-btn" onClick={cancel}>Cancel</button>
      </div>
    </MoreChrome>
  )
}

export function JoinPage(p: { initialUrl: string; onBack: () => void; onPaired: (url: string, token: string) => Promise<string> }) {
  const [url, setUrl] = useState(p.initialUrl)
  const [d, setD] = useState<string[]>(['', '', '', '', '', ''])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const code = d.join('')
  const put = (i: number, v: string) => {
    const digits = v.replace(/\D/g, '')
    if (digits.length > 1) {
      const next = [...d]
      digits.slice(0, 6 - i).split('').forEach((ch, k) => { next[i + k] = ch })
      setD(next)
      refs.current[Math.min(5, i + digits.length)]?.focus()
      return
    }
    const next = [...d]; next[i] = digits; setD(next)
    if (digits && i < 5) refs.current[i + 1]?.focus()
  }
  const go = async () => {
    setBusy(true); setErr(''); setDone('')
    try {
      const token = await pairClaim(url.trim(), code)
      setDone('Paired, syncing…')
      setDone(await p.onPaired(url.trim(), token))
    } catch (e) { setErr(msg(e)) } finally { setBusy(false) }
  }
  return (
    <MoreChrome title="Join with a code" onBack={p.onBack}>
      <div className="more-card" style={{ padding: 0 }}>
        <label className="sync-field">
          Bridge URL
          <input className="sync-input" name="sow-join-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" autoComplete="off" />
        </label>
        <div className="sync-field" style={{ paddingBottom: 0, borderBottom: 0 }}>6-digit code</div>
        <div className="sp-digits">
          {d.map((v, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el }}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              aria-label={`Digit ${i + 1}`}
              value={v}
              onChange={(e) => put(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !d[i] && i > 0) refs.current[i - 1]?.focus() }}
            />
          ))}
        </div>
        <div className="sp-row-btn">
          <button type="button" className="sp-btn pri" disabled={busy || code.length !== 6 || !url.trim()} onClick={() => void go()}>Pair</button>
        </div>
      </div>
      {err ? <div className="more-hint" style={{ color: 'var(--warn)' }} role="alert">{err}</div> : null}
      {done ? (
        <div className="more-card" role="status">
          <div className="sp-ok">✓ {done === 'Paired, syncing…' ? done : 'Paired'}</div>
          <div className="sp-sm" style={{ paddingTop: 0 }}>{done === 'Paired, syncing…' ? 'URL and token saved on this device' : done}</div>
        </div>
      ) : null}
    </MoreChrome>
  )
}

export function ImportSheet(p: { setup: SetupData; onCancel: () => void; onApply: (s: SetupData) => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const when = p.setup.exportedAt ? new Date(p.setup.exportedAt) : null
  const fmt = when && !isNaN(+when) ? when.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '—'
  const short = p.setup.syncUrl.replace(/(\/s\/.{4}).+(.{5}\/exec)$/, '$1…$2')
  const apply = async () => {
    setBusy(true); setErr('')
    try { await pingBridge(p.setup.syncUrl, p.setup.token); await p.onApply(p.setup) } catch (e) { setErr(msg(e)); setBusy(false) }
  }
  return (
    <div className="sp-scrim" onClick={(e) => { if (e.target === e.currentTarget && !busy) p.onCancel() }}>
      <div className="sp-sheet" role="dialog" aria-modal="true" aria-label="Import setup">
        <div className="sp-grab" />
        <div className="sp-title">Import setup?</div>
        <div className="more-hint" style={{ margin: '0 16px 10px' }}>From {SETUP_FILENAME} · replaces this device’s sync settings</div>
        <div className="sp-kv"><b>Apps Script sync URL</b><code>{short}</code></div>
        <div className="sp-kv"><b>Bridge token</b><code>{maskToken(p.setup.token)}</code></div>
        <div className="sp-kv"><b>Exported</b><code>{fmt}</code></div>
        {err ? <div className="more-hint" style={{ color: 'var(--warn)', margin: '8px 16px 0' }} role="alert">{err} · nothing changed</div> : null}
        <div className="sp-row-btn" style={{ paddingTop: 14 }}>
          <button type="button" className="sp-btn" onClick={p.onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="sp-btn pri" onClick={() => void apply()} disabled={busy}>{busy ? 'Checking…' : 'Apply'}</button>
        </div>
      </div>
    </div>
  )
}
