import { sessionDateLabel } from './dateLabel'
import type { DemoSession, SessionProgress } from '../demo/workspaceData'

type Props = {
  session: DemoSession
  progress: SessionProgress
  expanded: boolean
  onExpand: () => void
  onOpenChecklist: () => void
  /** v0.28 Share chooser for this class × date. */
  onShare: () => void
}

export function SessionCard({
  session,
  progress,
  expanded,
  onExpand,
  onOpenChecklist,
  onShare,
}: Props) {
  const topicBit =
    !expanded && session.topics[0]
      ? ` · ${session.topics[0]}`
      : ''
  const subjClass =
    session.subject === 'Math' ? 'math' : session.subject === 'Sci' ? 'sci' : 'eng'

  return (
    <div className={`ov-card${expanded ? ' exp' : ''}`}>
      <button
        type="button"
        className="top"
        onClick={onExpand}
        aria-expanded={expanded}
        style={{ background: 'none', border: 0, padding: 0, width: '100%', cursor: 'pointer' }}
      >
        <div className="meta" style={{ textAlign: 'left', minWidth: 0 }}>
          <div className={`ov-subj-tag ${subjClass}`}>
            {session.subject.toUpperCase()} · {session.kind}
          </div>
          <div className="k">{session.label}</div>
          <div className="line">
            {sessionDateLabel(session.date.date) ? `${sessionDateLabel(session.date.date)}: ` : ''}
            <b>{session.date.dayLabel}</b>
            {' · '}
            <b>
              {progress.set}/{progress.total}
              {expanded ? ' set' : ''}
            </b>
            {topicBit}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div className={`ov-ring ${progress.tone}`}>
            <span>{progress.pct}%</span>
          </div>
          <span className={`ov-chev${expanded ? ' open' : ''}`} aria-hidden>
            ›
          </span>
        </div>
      </button>

      {expanded ? (
        <>
          {session.topics.length ? (
            <div className="ov-topic">{session.topics.join(' · ')}</div>
          ) : null}
          <div className="ov-status">
            <div className="s set">Set {progress.set}</div>
            <div className="s">Submitted {progress.submitted}</div>
          </div>
        </>
      ) : null}

      {/* v0.28 (mock share-mj1): quiet one-word action row on every card */}
      <div className="ov-act">
        <button type="button" className={`ov-act-open${expanded ? ' hl' : ''}`} onClick={onOpenChecklist}>
          Open
        </button>
        <button type="button" className="ov-act-share" onClick={onShare}>
          Share
        </button>
      </div>
    </div>
  )
}
