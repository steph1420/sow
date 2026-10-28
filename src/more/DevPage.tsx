import { usePrefs } from '../prefs/PrefsContext'
import { MoreChrome } from './MoreChrome'
import './more.css'

type Props = { onBack: () => void }

/** Dev — gated physics / chrome knobs. Safety floors stay locked. */
export function DevPage({ onBack }: Props) {
  const { prefs, setPref } = usePrefs()

  return (
    <MoreChrome title="Dev options" onBack={onBack}>
      <div className="more-hint">
        Progressive disclosure · idle A–Z width 42 / letter ≥11px / hideEmpty default off are
        floors — not undercut here.
      </div>

      <div className="more-sec">A–Z</div>
      <div className="more-card">
        <button
          type="button"
          className="more-row"
          onClick={() => setPref('az.leftSide', !prefs['az.leftSide'])}
        >
          Left-side A–Z
          <span className={`toggle${prefs['az.leftSide'] ? ' on' : ''}`} aria-hidden />
        </button>
        <button
          type="button"
          className="more-row"
          onClick={() => setPref('az.hideEmpty', !prefs['az.hideEmpty'])}
        >
          Hide dimmed letters
          <span className={`toggle${prefs['az.hideEmpty'] ? ' on' : ''}`} aria-hidden />
        </button>
        <button
          type="button"
          className="more-row"
          onClick={() => setPref('az.showHud', !prefs['az.showHud'])}
        >
          Show scrub HUD
          <span className={`toggle${prefs['az.showHud'] ? ' on' : ''}`} aria-hidden />
        </button>
      </div>

      <div className="more-sec">Chrome</div>
      <div className="more-card">
        <button
          type="button"
          className="more-row"
          onClick={() => setPref('chrome.showFab', !prefs['chrome.showFab'])}
        >
          Sort/Filters FAB
          <span className={`toggle${prefs['chrome.showFab'] ? ' on' : ''}`} aria-hidden />
        </button>
      </div>
      <div className="more-hint">
        hideEmpty on collapses the strip on 21:9 — leave off unless you are testing dim vs hide.
      </div>
    </MoreChrome>
  )
}
