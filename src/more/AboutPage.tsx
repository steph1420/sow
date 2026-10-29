import { APP_VERSION } from '../lib/appVersion'
import { MoreChrome } from './MoreChrome'
import './more.css'

type Props = { onBack: () => void }

export function AboutPage({ onBack }: Props) {
  return (
    <MoreChrome title="About" onBack={onBack}>
      <div className="more-card">
        <div className="more-row" style={{ cursor: 'default' }}>
          SoW
          <span className="meta">Setting of Work</span>
        </div>
        <div className="more-row" style={{ cursor: 'default' }}>
          Version
          <span className="meta">{APP_VERSION}</span>
        </div>
        <div className="more-row" style={{ cursor: 'default' }}>
          Craft
          <span className="meta">Quiet Lucid</span>
        </div>
      </div>
      <div className="more-hint">
        Offline-first marking for the field. Marks save on this device; Sheet pull when readable;
        push when an Apps Script bridge is set.
      </div>
    </MoreChrome>
  )
}
