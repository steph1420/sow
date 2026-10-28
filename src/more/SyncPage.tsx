import { useCallback, useEffect, useState } from 'react'
import { getSettings, putSettings } from '../data'
import { readSyncStatus } from '../data/persistWorkspace'
import { useWorkspace } from '../demo/WorkspaceContext'
import { probeSheet, pullEng, pushLocal, type SyncReport } from '../sync'
import { MoreChrome } from './MoreChrome'
import './more.css'

type Props = { onBack: () => void }

/**
 * Sync — Quiet Lucid status + pull/push.
 * Offline-first: IDB persist always; Eng pull when sheet readable; push needs Apps Script URL.
 */
export function SyncPage({ onBack }: Props) {
  const { reloadFromIdb } = useWorkspace()
  const [sheetUrl, setSheetUrl] = useState('')
  const [syncUrl, setSyncUrl] = useState('')
  const [status, setStatus] = useState<Awaited<ReturnType<typeof readSyncStatus>> | null>(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<SyncReport | null>(null)

  const refresh = useCallback(async () => {
    const s = await getSettings()
    setSheetUrl(s.sheetUrl)
    setSyncUrl(s.syncUrl)
    setStatus(await readSyncStatus())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

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
      if (r.ok && r.mode === 'pull') await reloadFromIdb()
      await refresh()
    } finally {
      setBusy(false)
    }
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
        Offline-first · marks save to this device (IDB). Eng pull uses the Sheet link when readable.
        Push needs an Apps Script web-app URL — leave blank until connected.
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
        <div className="more-row" style={{ cursor: 'default' }}>
          Sheet
          <span className="meta">{status?.connectedSheet ? 'URL set' : 'Not set'}</span>
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
      <div className="more-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label className="more-hint" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
        <label className="more-hint" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
        <button type="button" className="more-row" style={{ borderRadius: 10 }} onClick={() => void saveUrls()} disabled={busy}>
          Save connections
        </button>
      </div>

      <div className="more-sec">Actions</div>
      <div className="more-card">
        <button type="button" className="more-row" disabled={busy} onClick={() => void run(probeSheet)}>
          Test sheet
          <span className="chev">›</span>
        </button>
        <button type="button" className="more-row" disabled={busy} onClick={() => void run(pullEng)}>
          Pull Eng tabs
          <span className="chev">›</span>
        </button>
        <button type="button" className="more-row" disabled={busy} onClick={() => void run(pushLocal)}>
          Push local
          <span className="chev">›</span>
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
