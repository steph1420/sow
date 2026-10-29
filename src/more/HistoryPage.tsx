import { useWorkspace } from '../demo/WorkspaceContext'
import { progressForSession } from '../demo/workspaceData'
import { MoreChrome } from './MoreChrome'
import './more.css'

type Props = {
  onBack: () => void
  onOpenSession: (classKey: string) => void
}

/** History — past/demo sessions with honest progress. */
export function HistoryPage({ onBack, onOpenSession }: Props) {
  const { historySessions: sessions, marksByClass, rosterFor, fromSheet, lastSyncAt } = useWorkspace()
  const synced = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <MoreChrome title="History" onBack={onBack}>
      <div className="more-hint">
        {fromSheet
          ? `From your sheet${synced ? ` · synced ${synced}` : ''} · the sheet keeps only each class’s current dates, so older sessions aren’t listed. Tap to open in Checklist.`
          : 'Demo sessions until your first Sync · tap to open in Checklist.'}
      </div>

      <div className="history-list">
        {sessions.map((s) => {
          const prog = progressForSession(
            marksByClass[s.classKey],
            rosterFor(s.classKey),
            s.date.date,
          )
          const tone = prog.tone === 'ok' ? '' : prog.tone
          return (
            <button
              key={s.id}
              type="button"
              className="history-item"
              onClick={() => onOpenSession(s.classKey)}
            >
              <div>
                <div className="k">{s.label}</div>
                <div className="line">
                  <b>{fromSheet ? `${s.date.dayLabel.split(' ')[0]} ${s.date.dayNum}` : s.date.dayLabel}</b>
                  {' · '}
                  <b>
                    {prog.set}/{prog.total}
                  </b>
                  {s.topics[0] ? ` · ${s.topics[0]}` : ''}
                </div>
              </div>
              <span className={`pct${tone ? ` ${tone}` : ''}`}>{prog.pct}%</span>
            </button>
          )
        })}
      </div>
    </MoreChrome>
  )
}
