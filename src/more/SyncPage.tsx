import { useCallback, useEffect, useState } from 'react'
import type { DiscoveredTab, SubjectId } from '../data/types'
import { getSettings, putSettings } from '../data'
import { readSyncStatus } from '../data/persistWorkspace'
import { useWorkspace } from '../demo/WorkspaceContext'
import { discoverAndStore, probeSheet, pullSubjects, syncNow, type SyncReport } from '../sync'
import { MoreChrome } from './MoreChrome'
import { DataSourceCard } from './DataSourceCard'
import { PrefsSyncCard } from './PrefsSyncCard'
import { clockWarning, readSkew } from '../sync/clockSkew'
import { runPrefsSync } from '../sync/prefsRunner'
import { usePrefs } from '../prefs/PrefsContext'
import './more.css'
import { haptic } from '../lib/haptics'
import { ImportSheet, JoinPage, OtherDevicesCard, PairHostPage, exportSetup } from './SetupDevices'
import { parseSetupFile, type SetupData } from '../sync/setupPair'

type Props = {
  onBack: () => void
  onOpenSubjects?: () => void
}

/** Chips = subjects that have ≥1 real discovered tab (t152u) — never a hardcoded list. */
function chipsFrom(tabs: DiscoveredTab[]): { subject: SubjectId; tabs: string[] }[] {
  const out: { subject: SubjectId; tabs: string[] }[] = []
  for (const t of tabs) {
    const hit = out.find((c) => c.subject === t.subject)
    if (hit) hit.tabs.push(t.name)
    else out.push({ subject: t.subject, tabs: [t.name] })
  }
  return out
}

/**
 * Sync — Sync now primary · Test / Pull only ghosts · this-run subject chips.
 * Offline-first honesty (pretty-mj2 · Steve t144).
 */
export function SyncPage({ onBack, onOpenSubjects }: Props) {
  const { reloadFromIdb } = useWorkspace()
  const { prefs } = usePrefs()
  const [sheetUrl, setSheetUrl] = useState('')
  const [syncUrl, setSyncUrl] = useState('')
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<Awaited<ReturnType<typeof readSyncStatus>> | null>(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<SyncReport | null>(null)
  /** This-run selection — not the forever catalog (Subjects owns that). */
  const [selected, setSelected] = useState<SubjectId[]>([])
  const [tabs, setTabs] = useState<DiscoveredTab[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [notes, setNotes] = useState<string[]>([])
  const chips = chipsFrom(tabs)
  const [view, setView] = useState<'main' | 'pair' | 'join'>('main')
  const [importing, setImporting] = useState<SetupData | null>(null)
  const [devMsg, setDevMsg] = useState<{ ok: boolean; text: string } | null>(null)
  // P1-2: offline gate — keep last tabs/chips, disable network actions, say so.
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  const applyTabs = useCallback((next: DiscoveredTab[]) => {
    setTabs(next)
    setSelected((cur) => {
      const avail = [...new Set(next.map((t) => t.subject))]
      const kept = cur.filter((s) => avail.includes(s))
      return kept.length ? kept : avail
    })
  }, [])

  const refresh = useCallback(async () => {
    const s = await getSettings()
    applyTabs(s.discoveredTabs ?? [])
    setNotes(s.syncNotes ?? [])
    setSheetUrl(s.sheetUrl)
    setSyncUrl(s.syncUrl)
    setToken(s.bridgeToken ?? '')
    setStatus(await readSyncStatus())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Discover real tabs on open when a Sheet URL is set (chips follow the workbook).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const s = await getSettings()
      if (!s.sheetUrl || !online) return
      setDiscovering(true)
      try {
        const r = await discoverAndStore()
        if (!cancelled && r.discovery) applyTabs(r.tabs)
      } finally {
        if (!cancelled) setDiscovering(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applyTabs, online])

  const saveUrls = async () => {
    await putSettings({ sheetUrl: sheetUrl.trim(), syncUrl: syncUrl.trim(), bridgeToken: token.trim() })
    await refresh()
  }

  const run = async (fn: () => Promise<SyncReport>) => {
    setBusy(true)
    setReport(null)
    try {
      await saveUrls()
      const r = await fn()
      setReport(r)
      haptic(r.ok ? 'success' : 'error')
      if (r.ok && (r.mode === 'pull' || r.mode === 'sync')) await reloadFromIdb()
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const toggleChip = (s: SubjectId) => {
    setSelected((cur) => {
      if (cur.includes(s)) {
        if (cur.length === 1) return cur // keep ≥1
        return cur.filter((x) => x !== s)
      }
      return [...cur, s]
    })
  }

  const last = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Never'

  if (view === 'pair') return <PairHostPage url={syncUrl.trim()} token={token.trim()} onBack={() => setView('main')} />
  if (view === 'join')
    return (
      <JoinPage
        initialUrl={syncUrl}
        showUrlOverride={!!prefs['sync.joinUrlOverride']}
        onBack={() => setView('main')}
        onPaired={async (url, tok) => {
          await putSettings({ syncUrl: url, bridgeToken: tok })
          await refresh()
          const r = await syncNow(selected)
          haptic(r.ok ? 'success' : 'error')
          if (r.ok) await reloadFromIdb()
          await refresh()
          return r.message
        }}
      />
    )

  return (
    <MoreChrome title="Sync" onBack={onBack}>
      <DataSourceCard />
      <div className="more-hint">
        Offline-first · marks save on this device. Pull any readable subject tabs from the Sheet.
        {syncUrl && token ? ' Push via the sheet bridge.' : ' Push not set up yet.'}
      </div>

      {/* v0.36.1 clock guard (t55u): warn when this phone's clock is off vs the sheet's. */}
      {clockWarning(readSkew()?.skewMs) ? (
        <div className="more-hint clock-warn" role="alert" style={{ color: 'var(--warn)' }}>⚠ {clockWarning(readSkew()?.skewMs)}</div>
      ) : null}

      <div className="more-sec">Status</div>
      <div className="more-card">
        <div className="more-row" style={{ cursor: 'default' }}>
          Last sync
          <span className="meta">{last}</span>
        </div>
        <div className="more-row" style={{ cursor: 'default' }}>
          Local dirty
          <span className="meta">{status?.syncDirty ? 'Yes' : 'No'}</span>
        </div>
        <div className="more-row more-row-stack" style={{ cursor: 'default' }}>
          <div className="more-row-main">
            Sheet
            <span className="meta" style={{ color: status?.connectedSheet ? 'var(--ok)' : undefined }}>
              {status?.connectedSheet ? 'URL set' : 'Not set'}
            </span>
          </div>
          <div className="more-row-sub">
            {tabs.length ? tabs.map((t) => t.name).join(' · ') : 'Tabs not discovered yet'}
          </div>
        </div>
        <div className="more-row" style={{ cursor: 'default' }}>
          Push bridge
          <span className="meta">{status?.connectedPush ? 'Connected' : 'Not connected'}</span>
        </div>
      </div>

      {!online ? (
        <div className="sync-offline" role="status">
          You’re offline · last sheet tabs kept · marks save on this device. Sync when back online.
        </div>
      ) : null}

      {status?.lastSyncError ? (
        <div className="more-hint" style={{ color: 'var(--warn)' }}>
          {status.lastSyncError}
        </div>
      ) : null}

      {notes.length ? (
        <div className="more-hint sync-note" role="note">
          {notes.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>
      ) : null}

      <div className="more-sec">Connections</div>
      <div className="more-card" style={{ padding: 0 }}>
        <label className="sync-field">
          Google Sheet URL
          <input
            className="sync-input"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            autoComplete="off"
            name="sow-sheet-url"
          />
        </label>
        <label className="sync-field">
          Apps Script sync URL (push)
          <input
            className="sync-input"
            value={syncUrl}
            onChange={(e) => setSyncUrl(e.target.value)}
            placeholder="Not connected — optional"
            autoComplete="off"
            name="sow-sync-url"
          />
        </label>
        <label className="sync-field">
          Bridge token
          <input
            className="sync-input"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="From the sheet: SoW › Show app token"
            autoComplete="off"
            name="sow-bridge-token"
            type="password"
          />
          <span className="more-row-sub" style={{ textTransform: 'none', letterSpacing: 0 }}>Hidden · saved on this device only</span>
        </label>
        <div className="pill-row">
          {chips.length === 0 ? (
            <span className="more-hint" style={{ margin: 0 }}>
              {!online ? 'Offline · tabs load when back online' : discovering ? 'Reading sheet tabs…' : 'No tabs found · Test sheet'}
            </span>
          ) : null}
          {chips.map((c) => (
            <button
              key={c.subject}
              type="button"
              className={`subj-pill${selected.includes(c.subject) ? ' on' : ''}`}
              onClick={() => toggleChip(c.subject)}
              disabled={busy}
              title={c.tabs.join(' · ')}
            >
              {c.subject} · {c.tabs.length}
            </button>
          ))}
          <button
            type="button"
            className="subj-pill"
            onClick={() => onOpenSubjects?.()}
            disabled={busy || !onOpenSubjects}
            title="Manage catalog in Subjects & sheets"
          >
            + tab
          </button>
        </div>
      </div>

      <OtherDevicesCard
        canHost={!!syncUrl.trim() && !!token.trim()}
        onPair={() => { void saveUrls(); setDevMsg(null); setView('pair') }}
        onJoin={() => { setDevMsg(null); setView('join') }}
        onExport={() => {
          void (async () => {
            await saveUrls()
            const t = await exportSetup({ syncUrl: syncUrl.trim(), token: token.trim(), sheetUrl: sheetUrl.trim() })
            if (t) setDevMsg({ ok: true, text: t })
          })()
        }}
        onImportFile={(text) => {
          const r = parseSetupFile(text)
          if (r.ok) { setDevMsg(null); setImporting(r.setup) } else setDevMsg({ ok: false, text: r.error })
        }}
      />
      {devMsg ? (
        <div className="more-hint" role="status" style={{ color: devMsg.ok ? undefined : 'var(--warn)' }}>{devMsg.text}</div>
      ) : null}
      {importing ? (
        <ImportSheet
          setup={importing}
          onCancel={() => setImporting(null)}
          onApply={async (su) => {
            await putSettings({ syncUrl: su.syncUrl, bridgeToken: su.token, ...(su.sheetUrl && !sheetUrl.trim() ? { sheetUrl: su.sheetUrl } : {}) })
            setImporting(null)
            await refresh()
            haptic('success')
            setDevMsg({ ok: true, text: 'Setup imported · tap Sync now' })
          }}
        />
      ) : null}

      <PrefsSyncCard online={online} refreshKey={status} />

      <button
        type="button"
        className="sync-cta"
        data-sync-now
        disabled={busy || !online || !selected.length}
        onClick={() => void run(async () => { const r = await syncNow(selected); void runPrefsSync('auto'); return r })}
      >
        <span className="spin" aria-hidden>
          ⟳
        </span>
        Sync now
      </button>
      <div className="more-hint" style={{ marginTop: -6 }}>
        Pulls selected tabs · marks save on this device · push not set up.
      </div>

      <div className="sync-secondary">
        <button
          type="button"
          className="ghost"
          disabled={busy || !online}
          onClick={() => void run(probeSheet)}
        >
          Test sheet
        </button>
        <button
          type="button"
          className="ghost"
          disabled={busy || !online || !selected.length}
          onClick={() => void run(() => pullSubjects(selected))}
        >
          Pull only
        </button>
      </div>

      {report ? (
        <div className="more-hint" style={{ color: report.ok ? 'var(--ok)' : 'var(--warn)' }}>
          {report.message}
        </div>
      ) : null}

      {busy ? <div className="more-hint">Working…</div> : null}
    </MoreChrome>
  )
}
