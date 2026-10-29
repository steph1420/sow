import { prettyClassLabel } from '../data/types'
import { useWorkspace } from '../demo/WorkspaceContext'
import { MoreChrome } from './MoreChrome'
import './more.css'

type Props = { onBack: () => void }

/** Roster — Quiet list of kids for the active class (from the sheet). */
export function RosterPage({ onBack }: Props) {
  const { activeClassKey, setActiveClassKey, rosterFor, classKeys, sheetTabs, lastSyncAt } = useWorkspace()
  if (!classKeys.length) {
    return (
      <MoreChrome title="Roster" onBack={onBack}>
        <div className="more-hint">Sync to load your classes — rosters come from your Google Sheet tabs.</div>
      </MoreChrome>
    )
  }
  const shownKey = classKeys.includes(activeClassKey) ? activeClassKey : classKeys[0]!
  const tabName = sheetTabs.find((t) => t.classKey === shownKey)?.name ?? prettyClassLabel(shownKey)
  const synced = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null
  const roster = rosterFor(shownKey)
  const active = roster.filter((r) => !r.left).length
  const left = roster.length - active

  return (
    <MoreChrome title="Roster" onBack={onBack}>
      <div className="more-hint">
        From sheet tab “{tabName}” · {active} active
        {left ? ` · ${left} left` : ''}
        {synced ? ` · last synced ${synced}` : ' · not pulled yet'}
      </div>

      <div className="class-chips">
        {classKeys.map((k) => (
          <button
            key={k}
            type="button"
            className={shownKey === k ? 'on' : ''}
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
