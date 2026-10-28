import type { DemoSession, SessionProgress } from '../demo/workspaceData'

type Props = {
  session: DemoSession
  progress: SessionProgress
  expanded: boolean
  onExpand: () => void
  onOpenChecklist: () => void
}

export function SessionCard({
  session,
  progress,
  expanded,
  onExpand,
  onOpenChecklist,
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
          <div className="ov-actions">
            <button type="button" className="btn primary" onClick={onOpenChecklist}>
              Open Checklist
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
