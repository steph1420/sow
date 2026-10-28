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
  const { sessions, marksByClass, rosterFor } = useWorkspace()

  return (
    <MoreChrome title="History" onBack={onBack}>
      <div className="more-hint">
        Demo sessions from the shared workspace · Open jumps to Checklist for that class.
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
                  <b>{s.date.dayLabel}</b>
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
