import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSettings, putSettings } from '../db'
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
  const [hideLeft, setHideLeft] = useState(false)
  const [theme, setTheme] = useState<'night' | 'day'>('night')
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      const s = await getSettings()
      setSheetUrl(s.sheetUrl || '')
      setHideLeft(!!s.hideLeft)
      setTheme(s.theme === 'day' ? 'day' : 'night')
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!ready) return
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme, ready])

  async function saveUrl(next: string) {
    setSheetUrl(next)
    await putSettings({ sheetUrl: next })
  }

  async function paste() {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (text) {
        await saveUrl(text)
        setTestMsg(null)
      }
    } catch {
      setTestMsg({ ok: false, text: 'Clipboard blocked — paste into the box.' })
    }
  }

  function test() {
    if (!sheetUrl.trim()) {
      setTestMsg({ ok: false, text: 'Paste a Sheet URL first.' })
      return
    }
    if (looksLikeSheet(sheetUrl.trim())) {
      setTestMsg({ ok: true, text: 'Looks like a Google Sheet URL (stored locally; sync lands in JB-6).' })
    } else {
      setTestMsg({ ok: false, text: 'URL should be a docs.google.com/spreadsheets link.' })
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
            onChange={(e) => void saveUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…/edit"
          />
          <div className="btn-pair">
            <button type="button" className="paste" onClick={() => void paste()}>
              Paste
            </button>
            <button type="button" className="test" onClick={test}>
              Test
            </button>
          </div>
          {testMsg ? (
            <p className={`test-msg ${testMsg.ok ? 'ok' : 'bad'}`} style={{ marginTop: 8 }}>
              {testMsg.text}
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

      <p className="foot-note">App writes its own tabs. Local-first; sheet is the shared backup.</p>

      <Link to="/history" className="btn-secondary" style={{ display: 'block' }}>
        History →
      </Link>
    </div>
  )
}
