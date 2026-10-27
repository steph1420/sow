import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSettings, putSettings } from '../db'
import { runSync, testConnection } from '../sync'
import '../styles/shell.css'

function looksLikeSheet(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname.includes('docs.google.com') && u.pathname.includes('/spreadsheets/')
  } catch {
    return false
  }
}

export default function SettingsPage() {
  const [sheetUrl, setSheetUrl] = useState('')
  const [syncUrl, setSyncUrl] = useState('')
  const [hideLeft, setHideLeft] = useState(false)
  const [theme, setTheme] = useState<'night' | 'day'>('night')
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      const s = await getSettings()
      setSheetUrl(s.sheetUrl || '')
      setSyncUrl(s.syncUrl || '')
      setHideLeft(!!s.hideLeft)
      setTheme(s.theme === 'day' ? 'day' : 'night')
      setLastSyncAt(s.lastSyncAt || '')
      if (s.lastSyncError) setSyncMsg({ ok: false, text: s.lastSyncError })
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!ready) return
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme, ready])

  async function saveSheet(next: string) {
    setSheetUrl(next)
    await putSettings({ sheetUrl: next })
  }

  async function saveSyncUrl(next: string) {
    setSyncUrl(next)
    await putSettings({ syncUrl: next })
  }

  async function pasteSheet() {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (text) {
        await saveSheet(text)
        setTestMsg(null)
      }
    } catch {
      setTestMsg({ ok: false, text: 'Clipboard blocked — paste into the box.' })
    }
  }

  async function onTest() {
    setBusy(true)
    setTestMsg(null)
    try {
      if (!sheetUrl.trim()) {
        setTestMsg({ ok: false, text: 'Paste a Sheet URL first.' })
        return
      }
      if (!looksLikeSheet(sheetUrl.trim()) && !/^[a-zA-Z0-9-_]{20,}$/.test(sheetUrl.trim())) {
        setTestMsg({ ok: false, text: 'URL should be a docs.google.com/spreadsheets link.' })
        return
      }
      const r = await testConnection()
      setTestMsg({ ok: r.ok, text: r.message })
    } finally {
      setBusy(false)
    }
  }

  async function onSync() {
    setBusy(true)
    setSyncMsg(null)
    try {
      if (!navigator.onLine) {
        setSyncMsg({ ok: false, text: 'You are offline — sync when you have a connection.' })
        return
      }
      const r = await runSync()
      setSyncMsg({ ok: r.ok, text: r.message })
      if (r.ok) {
        const s = await getSettings()
        setLastSyncAt(s.lastSyncAt || '')
      }
    } catch (e) {
      setSyncMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  async function toggleHide() {
    const next = !hideLeft
    setHideLeft(next)
    await putSettings({ hideLeft: next })
  }

  async function toggleTheme() {
    const next = theme === 'night' ? 'day' : 'night'
    setTheme(next)
    await putSettings({ theme: next })
    window.dispatchEvent(new CustomEvent('sow-theme', { detail: next }))
  }

  return (
    <div className="shell-page">
      <div className="row-top">
        <Link className="back" to="/">
          ← Home
        </Link>
        <h2 className="page-title" style={{ fontSize: 22 }}>
          Settings
        </h2>
      </div>
      <p className="sub">Sync + Mark preferences</p>

      <div className="settings-card">
        <div>
          <p className="field-label">Google Sheet URL</p>
          <p className="hint">
            Paste the workbook the app owns (SoW_Sessions / SoW_Marks / SoW_RosterMeta)
          </p>
          <input
            type="url"
            value={sheetUrl}
            onChange={(e) => void saveSheet(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…/edit"
          />
          <div className="btn-pair">
            <button type="button" className="paste" disabled={busy} onClick={() => void pasteSheet()}>
              Paste
            </button>
            <button type="button" className="test" disabled={busy} onClick={() => void onTest()}>
              Test
            </button>
          </div>
          {testMsg ? (
            <p className={`test-msg ${testMsg.ok ? 'ok' : 'bad'}`} style={{ marginTop: 8 }}>
              {testMsg.text}
            </p>
          ) : null}
        </div>

        <div>
          <p className="field-label">Sync Web App URL</p>
          <p className="hint">
            Optional fallback. Prefer Google Sheets connected in chat (bot creates/pushes SoW_*). Apps Script only if you need device-side push.
          </p>
          <input
            type="url"
            value={syncUrl}
            onChange={(e) => void saveSyncUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
          />
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: 10 }}
            disabled={busy}
            onClick={() => void onSync()}
          >
            {busy ? 'Working…' : 'Sync now'}
          </button>
          {syncMsg ? (
            <p className={`test-msg ${syncMsg.ok ? 'ok' : 'bad'}`} style={{ marginTop: 8 }}>
              {syncMsg.text}
            </p>
          ) : null}
          {lastSyncAt ? (
            <p className="foot-note" style={{ marginTop: 8 }}>
              Last sync: {new Date(lastSyncAt).toLocaleString()}
            </p>
          ) : null}
        </div>

        <div className="toggle-row">
          <div>
            <div className="t-label">Hide left students</div>
            <div className="t-hint">Off = show muted, not tappable</div>
          </div>
          <button
            type="button"
            className={`toggle${hideLeft ? ' on' : ''}`}
            aria-pressed={hideLeft}
            onClick={() => void toggleHide()}
          />
        </div>

        <div className="toggle-row">
          <div>
            <div className="t-label">Day theme</div>
            <div className="t-hint">Night default</div>
          </div>
          <button
            type="button"
            className={`toggle${theme === 'day' ? ' on' : ''}`}
            aria-pressed={theme === 'day'}
            onClick={() => void toggleTheme()}
          />
        </div>
      </div>

      <p className="foot-note">
        App writes its own tabs only via bot connector or optional Apps Script. Teaching tabs stay read-only. See docs/SYNC_SETUP.md.
      </p>

      <Link to="/history" className="btn-secondary" style={{ display: 'block' }}>
        History →
      </Link>
    </div>
  )
}
