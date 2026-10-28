import { usePrefs } from '../prefs/PrefsContext'
import { MoreChrome } from './MoreChrome'
import './more.css'

type Props = {
  onBack: () => void
  onOpenDev: () => void
  onOpenSync: () => void
}

/**
 * Settings — Quiet prefs that matter only.
 * No empty toggles / preference farm. Dev + Sync are progressive disclosure.
 */
export function SettingsPage({ onBack, onOpenDev, onOpenSync }: Props) {
  const { prefs, setTheme, setPref } = usePrefs()

  return (
    <MoreChrome title="Settings" onBack={onBack}>
      <div className="more-sec">Appearance</div>
      <div className="more-card">
        <div className="more-row" style={{ cursor: 'default' }}>
          Theme
          <div className="seg" style={{ marginLeft: 'auto', width: 160 }}>
            <button
              type="button"
              className={prefs.theme === 'night' ? 'on' : ''}
              onClick={() => setTheme('night')}
            >
              Night
            </button>
            <button
              type="button"
              className={prefs.theme === 'day' ? 'on' : ''}
              onClick={() => setTheme('day')}
            >
              Day
            </button>
          </div>
        </div>
      </div>
      <div className="more-hint">Quiet Lucid tokens · Day is soft paper, not high-chrome.</div>

      <div className="more-sec">Checklist</div>
      <div className="more-card">
        <button
          type="button"
          className="more-row"
          onClick={() => setPref('chrome.showFab', !prefs['chrome.showFab'])}
        >
          Show Sort/Filters FAB
          <span
            className={`toggle${prefs['chrome.showFab'] ? ' on' : ''}`}
            aria-hidden
          />
        </button>
      </div>
      <div className="more-hint">
        Default off so the roster stays the hero. Turn on only when you want the cluster.
      </div>

      <div className="more-sec">System</div>
      <div className="more-card">
        <button type="button" className="more-row" onClick={onOpenSync}>
          Sync
          <span className="chev">›</span>
        </button>
        <button type="button" className="more-row" onClick={onOpenDev}>
          Dev options
          <span className="chev">›</span>
        </button>
      </div>
      <div className="more-hint">Sync is offline-first · Eng pull when the Sheet is reachable · push needs Apps Script.</div>
    </MoreChrome>
  )
}
