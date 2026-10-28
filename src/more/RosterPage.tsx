import { CLASS_KEYS, prettyClassLabel } from '../data/types'
import { useWorkspace } from '../demo/WorkspaceContext'
import { MoreChrome } from './MoreChrome'
import './more.css'

type Props = { onBack: () => void }

/** Roster — Quiet list of kids for the active class (demo data). */
export function RosterPage({ onBack }: Props) {
  const { activeClassKey, setActiveClassKey, rosterFor } = useWorkspace()
  const roster = rosterFor(activeClassKey)
  const active = roster.filter((r) => !r.left).length
  const left = roster.length - active

  return (
    <MoreChrome title="Roster" onBack={onBack}>
      <div className="more-hint">
        Active class roster from demo workspace · {active} active
        {left ? ` · ${left} left` : ''} · Sync will replace this in Phase E.
      </div>

      <div className="class-chips">
        {CLASS_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={activeClassKey === k ? 'on' : ''}
            onClick={() => setActiveClassKey(k)}
          >
            {prettyClassLabel(k)}
          </button>
        ))}
      </div>

      <div className="roster-list">
        {roster.map((r) => (
          <div key={r.roll} className={`roster-item${r.left ? ' left' : ''}`}>
            <span className="roll">{r.roll}</span>
            <span className="name">{r.name}</span>
            <span className="tag">{r.left ? 'Left' : ''}</span>
          </div>
        ))}
      </div>
    </MoreChrome>
  )
}
