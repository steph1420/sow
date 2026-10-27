import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSettings, putSettings } from '../db'
import {
  exportPrefsText,
  importPrefsText,
  loadPrefs,
  savePrefs,
  subscribePrefs,
  type DateUi,
  type FilterDefault,
  type FilterUi,
  type OverviewFilterStyle,
  type SowPrefs,
  type StatusMode,
  type UndoChrome,
} from '../lib/sowPrefs'
import { runSync, testConnection } from '../sync'
import '../styles/shell.css'
import '../styles/settings.css'

function looksLikeSheet(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname.includes('docs.google.com') && u.pathname.includes('/spreadsheets/')
  } catch {
    return false
  }
}

type Panel = 'root' | 'dev'

export default function SettingsPage() {
  const [panel, setPanel] = useState<Panel>('root')
  const [sheetUrl, setSheetUrl] = useState('')
  const [syncUrl, setSyncUrl] = useState('')
  const [hideLeft, setHideLeft] = useState(false)
  const [theme, setTheme] = useState<'night' | 'day'>('night')
  const [prefs, setPrefs] = useState<SowPrefs>(() => loadPrefs())
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState('')
  const [ready, setReady] = useState(false)
  const [exportFlash, setExportFlash] = useState(false)
  const [importText, setImportText] = useState('')
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)

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

  useEffect(() => subscribePrefs(setPrefs), [])

  useEffect(() => {
    if (!ready) return
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme, ready])

  const exportBlock = useMemo(() => exportPrefsText(prefs), [prefs])

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

  async function setThemeValue(next: 'night' | 'day') {
    setTheme(next)
    await putSettings({ theme: next })
    window.dispatchEvent(new CustomEvent('sow-theme', { detail: next }))
  }

  function patchPrefs(patch: Partial<SowPrefs>) {
    setPrefs(savePrefs(patch))
  }

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportBlock)
      setExportFlash(true)
      window.setTimeout(() => setExportFlash(false), 1400)
    } catch {
      window.prompt('Copy preferences:', exportBlock)
    }
  }

  function runImport() {
    const next = importPrefsText(importText)
    if (!next) {
      setImportMsg({ ok: false, text: 'Need a sow.prefs.v1 block.' })
      return
    }
    setPrefs(next)
    setImportMsg({ ok: true, text: 'Imported.' })
  }

  if (panel === 'dev') {
    return (
      <div className="shell-page stg">
        <div className="row-top">
          <button type="button" className="back" onClick={() => setPanel('root')}>
            ← Settings
          </button>
          <h2 className="page-title" style={{ fontSize: 22 }}>
            Developer
          </h2>
        </div>
        <p className="sub">Feel-lab knobs. Export prefs to paste to Kiwi.</p>

        <p className="stg-section">A–Z physics</p>
        <div className="stg-card">
          <SegRow
            label="Mode"
            hint="Single bulge · Fisheye neighbors"
            value={prefs['az.mode']}
            options={[
              { id: 'single', label: 'Single' },
              { id: 'fisheye', label: 'Fisheye' },
            ]}
            onChange={(v) => patchPrefs({ 'az.mode': v })}
          />
          <ToggleRow
            label="Widen on hold"
            hint="Strip enlarges while scrubbing"
            on={prefs['az.widenOnPress']}
            onToggle={() => patchPrefs({ 'az.widenOnPress': !prefs['az.widenOnPress'] })}
          />
          <ToggleRow
            label="Hide empty letters"
            hint="Hide letters with no kids"
            on={prefs['az.hideEmpty']}
            onToggle={() => patchPrefs({ 'az.hideEmpty': !prefs['az.hideEmpty'] })}
          />
          <ToggleRow
            label="HUD letter bubble"
            hint="Center balloon while scrubbing"
            on={prefs['az.showHud']}
            onToggle={() => patchPrefs({ 'az.showHud': !prefs['az.showHud'] })}
          />
          <NumRow
            label="Press width"
            hint="px while held"
            value={prefs['az.pressWidth']}
            min={16}
            max={72}
            onChange={(n) => patchPrefs({ 'az.pressWidth': n })}
          />
          <NumRow
            label="Press font"
            hint="px all letters while held"
            value={prefs['az.pressFont']}
            min={8}
            max={20}
            onChange={(n) => patchPrefs({ 'az.pressFont': n })}
          />
          <NumRow
            label="Focus font"
            hint="px focused letter"
            value={prefs['az.focusFont']}
            min={12}
            max={36}
            onChange={(n) => patchPrefs({ 'az.focusFont': n })}
          />
          <NumRow
            label="Fisheye strength"
            hint="0–100"
            value={prefs['az.fe.strength']}
            min={0}
            max={100}
            onChange={(n) => patchPrefs({ 'az.fe.strength': n })}
          />
          <NumRow
            label="Fisheye push"
            hint="Neighbors yield"
            value={prefs['az.fe.push']}
            min={0}
            max={100}
            onChange={(n) => patchPrefs({ 'az.fe.push': n })}
          />
          <NumRow
            label="Fisheye relative"
            hint="Neighbor size vs focus"
            value={prefs['az.fe.relative']}
            min={0}
            max={100}
            onChange={(n) => patchPrefs({ 'az.fe.relative': n })}
          />
          <NumRow
            label="Fisheye count"
            hint="Letters each side"
            value={prefs['az.fe.count']}
            min={1}
            max={5}
            onChange={(n) => patchPrefs({ 'az.fe.count': n })}
          />
        </div>

        <p className="stg-section">Checklist chrome</p>
        <div className="stg-card">
          <SegRow
            label="Default filter"
            value={prefs['filter.default']}
            options={[
              { id: 'none', label: 'None' },
              { id: 'pending', label: 'Pending' },
              { id: 'letter', label: 'Letter' },
            ]}
            onChange={(v) => patchPrefs({ 'filter.default': v as FilterDefault })}
          />
          <ToggleRow
            label="Show Pending chip"
            on={prefs['filter.showPending']}
            onToggle={() => patchPrefs({ 'filter.showPending': !prefs['filter.showPending'] })}
          />
          <ToggleRow
            label="Show Letter chip"
            on={prefs['filter.showLetter']}
            onToggle={() => patchPrefs({ 'filter.showLetter': !prefs['filter.showLetter'] })}
          />
          <ToggleRow
            label="Show Sort in FAB"
            on={prefs['filter.showSort']}
            onToggle={() => patchPrefs({ 'filter.showSort': !prefs['filter.showSort'] })}
          />
          <ToggleRow
            label="Show Search icon"
            on={prefs['filter.showSearch']}
            onToggle={() => patchPrefs({ 'filter.showSearch': !prefs['filter.showSearch'] })}
          />
          <SegRow
            label="Filter UI"
            hint="Stored · Myntra is live"
            value={prefs['filter.ui']}
            options={[
              { id: 'myntra', label: 'Bar+sheets' },
              { id: 'popover', label: 'Popover' },
              { id: 'chips', label: 'Chips' },
            ]}
            onChange={(v) => patchPrefs({ 'filter.ui': v as FilterUi })}
          />
          <SegRow
            label="Date UI"
            hint="Export / future chrome"
            value={prefs['date.ui']}
            options={[
              { id: 'quiet', label: 'Quiet' },
              { id: 'tinyChips', label: 'Chips' },
              { id: 'slimBar', label: 'Slim' },
              { id: 'dualCards', label: 'Dual' },
            ]}
            onChange={(v) => patchPrefs({ 'date.ui': v as DateUi })}
          />
          <SegRow
            label="Status mode"
            hint="Product default Hidden"
            value={prefs['status.mode']}
            options={[
              { id: 'hidden', label: 'Hidden' },
              { id: 'withDate', label: 'w/ date' },
              { id: 'inDate', label: 'In date' },
            ]}
            onChange={(v) => patchPrefs({ 'status.mode': v as StatusMode })}
          />
        </div>

        <p className="stg-section">Overview filters</p>
        <div className="stg-card">
          <SegRow
            label="Filter selected style"
            hint="Soft shade is default"
            value={prefs['overview.filterStyle']}
            options={[
              { id: 'underline', label: 'Underline' },
              { id: 'shade', label: 'Shade' },
              { id: 'boldColor', label: 'Bold+color' },
            ]}
            onChange={(v) => patchPrefs({ 'overview.filterStyle': v as OverviewFilterStyle })}
          />
        </div>

        <p className="stg-section">Undo / Redo</p>
        <div className="stg-card">
          <SegRow
            label="Control style"
            hint="Per-class stacks"
            value={prefs['undo.chrome']}
            options={[
              { id: 'icons', label: 'Icons' },
              { id: 'iconsLabel', label: 'Icons+label' },
            ]}
            onChange={(v) => patchPrefs({ 'undo.chrome': v as UndoChrome })}
          />
        </div>

        <p className="stg-section">Preferences export</p>
        <div className="stg-card">
          <pre className="stg-export">{exportBlock}</pre>
          <button type="button" className="stg-link-row" onClick={() => void copyExport()}>
            {exportFlash ? 'Copied' : 'Copy export'}
          </button>
          <p className="stg-hint" style={{ padding: '8px 14px 0' }}>
            Import preferences
          </p>
          <textarea
            className="stg-import"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste sow.prefs.v1 block…"
            rows={5}
          />
          <button type="button" className="stg-link-row" onClick={runImport}>
            Import
          </button>
          {importMsg ? (
            <p className={`test-msg ${importMsg.ok ? 'ok' : 'bad'}`} style={{ padding: '0 14px 10px' }}>
              {importMsg.text}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="shell-page stg">
      <div className="row-top">
        <Link className="back" to="/overview">
          ← More
        </Link>
        <h2 className="page-title" style={{ fontSize: 22 }}>
          Settings
        </h2>
      </div>
      <p className="sub">Sheet, appearance, Checklist prefs</p>

      <p className="stg-section">Sheet & sync</p>
      <div className="stg-card">
        <div className="stg-block">
          <p className="field-label">Google Sheet URL</p>
          <p className="hint">Eng teaching tabs — Sync A pulls Current + ticks</p>
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
        <div className="stg-block">
          <p className="field-label">Sync Web App URL</p>
          <p className="hint">
            Optional Apps Script …/exec. Do <strong>not</strong> paste the Sheet URL here.
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
      </div>

      <p className="stg-section">Appearance</p>
      <div className="stg-card">
        <SegRow
          label="Theme"
          value={theme}
          options={[
            { id: 'day', label: 'Day' },
            { id: 'night', label: 'Night' },
          ]}
          onChange={(v) => void setThemeValue(v as 'night' | 'day')}
        />
        <ToggleRow
          label="Night bold"
          hint="Heavier weights (night)"
          on={prefs['appearance.nightBold']}
          onToggle={() => patchPrefs({ 'appearance.nightBold': !prefs['appearance.nightBold'] })}
        />
        <ToggleRow
          label="Day bold"
          hint="Heavier weights (day)"
          on={prefs['appearance.dayBold']}
          onToggle={() => patchPrefs({ 'appearance.dayBold': !prefs['appearance.dayBold'] })}
        />
        <ToggleRow
          label="Day high-contrast"
          hint="Day only"
          on={prefs['appearance.dayHC']}
          onToggle={() => patchPrefs({ 'appearance.dayHC': !prefs['appearance.dayHC'] })}
        />
        <ToggleRow
          label="Hide left students"
          hint="Off = show muted, not tappable"
          on={hideLeft}
          onToggle={() => void toggleHide()}
        />
      </div>

      <p className="stg-section">Checklist</p>
      <div className="stg-card">
        <SegRow
          label="Default filter"
          value={prefs['filter.default']}
          options={[
            { id: 'none', label: 'None' },
            { id: 'pending', label: 'Pending' },
            { id: 'letter', label: 'Letter' },
          ]}
          onChange={(v) => patchPrefs({ 'filter.default': v as FilterDefault })}
        />
        <button type="button" className="stg-nav-row" onClick={() => setPanel('dev')}>
          <div>
            <div className="t-label">Overview filter style</div>
            <div className="t-hint">Underline / Shade / Bold+color</div>
          </div>
          <span className="stg-chev">Dev ›</span>
        </button>
        <button type="button" className="stg-nav-row" onClick={() => setPanel('dev')}>
          <div>
            <div className="t-label">Undo / Redo</div>
            <div className="t-hint">Icons · per-class stacks</div>
          </div>
          <span className="stg-chev">Dev ›</span>
        </button>
      </div>

      <p className="stg-section">A–Z scrubber</p>
      <div className="stg-card">
        <p className="stg-hint" style={{ padding: '10px 14px' }}>
          Physics prefs live in Developer options (export for Kiwi). Checklist shows thin idle strip.
        </p>
        <button type="button" className="stg-nav-row" onClick={() => setPanel('dev')}>
          <div>
            <div className="t-label">Widen / Fisheye / Hide empty</div>
            <div className="t-hint">STG / Dev</div>
          </div>
          <span className="stg-chev">Dev ›</span>
        </button>
      </div>

      <p className="stg-section">Developer</p>
      <div className="stg-card">
        <button type="button" className="stg-nav-row" onClick={() => setPanel('dev')}>
          <div>
            <div className="t-label">Developer options</div>
            <div className="t-hint">A–Z physics, filter style, undo, export</div>
          </div>
          <span className="stg-chev">›</span>
        </button>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string
  hint?: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div className="toggle-row stg-row">
      <div>
        <div className="t-label">{label}</div>
        {hint ? <div className="t-hint">{hint}</div> : null}
      </div>
      <button type="button" className={`toggle${on ? ' on' : ''}`} aria-pressed={on} onClick={onToggle} />
    </div>
  )
}

function SegRow<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string
  hint?: string
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="stg-row stg-seg-wrap">
      <div className="stg-seg-label">
        <div className="t-label">{label}</div>
        {hint ? <div className="t-hint">{hint}</div> : null}
      </div>
      <div className="stg-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className={value === o.id ? 'on' : ''}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function NumRow({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  return (
    <div className="stg-row stg-num">
      <div>
        <div className="t-label">{label}</div>
        {hint ? <div className="t-hint">{hint}</div> : null}
      </div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
