import { usePrefs } from '../prefs/PrefsContext'
import { MoreChrome } from './MoreChrome'
import './more.css'

type Props = { onBack: () => void }

/** Dev — gated physics / chrome knobs. Safety floors stay locked. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

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
        <button
          type="button"
          className="more-row dev-swipe-single"
          onClick={() => setPref('gestures.swipeSingleRow', !prefs['gestures.swipeSingleRow'])}
        >
          Swipe ticks one row only
          <span className={`toggle${prefs['gestures.swipeSingleRow'] ? ' on' : ''}`} aria-hidden />
        </button>
      </div>

      {/* v0.29.2 Q-FIX-6 (t3u): academic year start for sheet dates without a year (default April). */}
      <div className="more-sec">Sync</div>
      <div className="more-card">
        <label className="more-row dev-year-start" style={{ position: 'relative' }}>
          Academic year starts
          <span className="meta">{MONTHS[(prefs['sync.yearStartMonth'] ?? 4) - 1]}</span>
          <select
            aria-label="Academic year starts"
            value={prefs['sync.yearStartMonth'] ?? 4}
            onChange={(e) => setPref('sync.yearStartMonth', Number(e.target.value))}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%' }}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
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
