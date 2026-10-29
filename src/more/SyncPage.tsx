import { useCallback, useEffect, useState } from 'react'
import type { DiscoveredTab, SubjectId } from '../data/types'
import { getSettings, putSettings } from '../data'
import { readSyncStatus } from '../data/persistWorkspace'
import { useWorkspace } from '../demo/WorkspaceContext'
import { discoverAndStore, probeSheet, pullSubjects, syncNow, type SyncReport } from '../sync'
import { MoreChrome } from './MoreChrome'
import './more.css'

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
  const [sheetUrl, setSheetUrl] = useState('')
  const [syncUrl, setSyncUrl] = useState('')
  const [status, setStatus] = useState<Awaited<ReturnType<typeof readSyncStatus>> | null>(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<SyncReport | null>(null)
  /** This-run selection — not the forever catalog (Subjects owns that). */
  const [selected, setSelected] = useState<SubjectId[]>([])
  const [tabs, setTabs] = useState<DiscoveredTab[]>([])
  const [discovering, setDiscovering] = useState(false)
  const chips = chipsFrom(tabs)

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
    setSheetUrl(s.sheetUrl)
    setSyncUrl(s.syncUrl)
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
      if (!s.sheetUrl) return
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
  }, [applyTabs])

  const saveUrls = async () => {
    await putSettings({ sheetUrl: sheetUrl.trim(), syncUrl: syncUrl.trim() })
    await refresh()
  }

  const run = async (fn: () => Promise<SyncReport>) => {
    setBusy(true)
    setReport(null)
    try {
      await saveUrls()
      const r = await fn()
      setReport(r)
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

  return (
    <MoreChrome title="Sync" onBack={onBack}>
      <div className="more-hint">
        Offline-first · marks save on this device. Pull any readable subject tabs from the Sheet.
        Push needs an Apps Script URL — leave blank until connected.
      </div>

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

      {status?.lastSyncError ? (
        <div className="more-hint" style={{ color: 'var(--warn)' }}>
          {status.lastSyncError}
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
        <div className="pill-row">
          {chips.length === 0 ? (
            <span className="more-hint" style={{ margin: 0 }}>
              {discovering ? 'Reading sheet tabs…' : 'No tabs found · Test sheet'}
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

      <button
        type="button"
        className="sync-cta"
        disabled={busy || !selected.length}
        onClick={() => void run(() => syncNow(selected))}
      >
        <span className="spin" aria-hidden>
          ⟳
        </span>
        Sync now
      </button>
      <div className="more-hint" style={{ marginTop: -6 }}>
        Pulls selected tabs · pushes when bridge ready. Marks always save on this device.
      </div>

      <div className="sync-secondary">
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => void run(probeSheet)}
        >
          Test sheet
        </button>
        <button
          type="button"
          className="ghost"
          disabled={busy || !selected.length}
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
