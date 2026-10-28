import { CLASS_KEYS, subjectOf } from '../data/types'
import { MoreChrome } from './MoreChrome'
import './more.css'

type Props = { onBack: () => void }

/**
 * Subjects & sheets — catalog owner (honest stub).
 * Sync chips = this-run only; this page does not invent forever Sci tabs.
 */
export function SubjectsPage({ onBack }: Props) {
  const eng = CLASS_KEYS.filter((k) => subjectOf(k) === 'Eng')
  const math = CLASS_KEYS.filter((k) => subjectOf(k) === 'Math')

  return (
    <MoreChrome title="Subjects & sheets" onBack={onBack}>
      <div className="more-hint">
        Catalog of subject tabs the app knows. Sync’s chips only pick what to pull this run —
        add or rename real Sheet tabs here later (not from Sync forever).
      </div>

      <div className="more-sec">On device</div>
      <div className="more-card">
        <div className="more-row" style={{ cursor: 'default' }}>
          Eng
          <span className="meta">{eng.length} tabs · live</span>
        </div>
        <div className="more-row" style={{ cursor: 'default' }}>
          Math
          <span className="meta">{math.length} tabs · demo</span>
        </div>
        <div className="more-row" style={{ cursor: 'default' }}>
          Sci
          <span className="meta">Not on sheet yet</span>
        </div>
      </div>

      <div className="more-sec">Tabs</div>
      <div className="more-card">
        {CLASS_KEYS.map((k) => (
          <div key={k} className="more-row" style={{ cursor: 'default' }}>
            {k.replace(/_/g, ' · ')}
            <span className="meta">{subjectOf(k)}</span>
          </div>
        ))}
      </div>

      <div className="more-hint">
        Sci stays listed so Sync can say “not yet” honestly — we won’t pretend a Sci tab exists.
      </div>
    </MoreChrome>
  )
}
