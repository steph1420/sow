import { NAME_SWIPE_OPTIONS, normalizeNameSwipe } from '../checklist/gestures/nameSwipe'
import { SWIPE_CONFIRM_STYLES, normalizeSwipeStyle } from '../checklist/gestures/swipeConfirm'
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
         role="switch" aria-checked={Boolean(prefs['az.leftSide'])}>
          Left-side A–Z
          <span className={`toggle${prefs['az.leftSide'] ? ' on' : ''}`} aria-hidden />
        </button>
        <button
          type="button"
          className="more-row"
          onClick={() => setPref('az.hideEmpty', !prefs['az.hideEmpty'])}
         role="switch" aria-checked={Boolean(prefs['az.hideEmpty'])}>
          Hide dimmed letters
          <span className={`toggle${prefs['az.hideEmpty'] ? ' on' : ''}`} aria-hidden />
        </button>
        <button
          type="button"
          className="more-row"
          onClick={() => setPref('az.showHud', !prefs['az.showHud'])}
         role="switch" aria-checked={Boolean(prefs['az.showHud'])}>
          Show scrub HUD
          <span className={`toggle${prefs['az.showHud'] ? ' on' : ''}`} aria-hidden />
        </button>
        <button
          type="button"
          className="more-row dev-swipe-single"
          onClick={() => setPref('gestures.swipeSingleRow', !prefs['gestures.swipeSingleRow'])}
         role="switch" aria-checked={Boolean(prefs['gestures.swipeSingleRow'])}>
          Swipe ticks one row only
          <span className={`toggle${prefs['gestures.swipeSingleRow'] ? ' on' : ''}`} aria-hidden />
        </button>
        <button
          type="button"
          className="more-row dev-kbd-advance"
          role="switch"
          aria-checked={Boolean(prefs['kbd.autoAdvance'])}
          onClick={() => setPref('kbd.autoAdvance', !prefs['kbd.autoAdvance'])}
        >
          Keyboard tick moves to next pupil
          <span className={`toggle${prefs['kbd.autoAdvance'] ? ' on' : ''}`} aria-hidden />
        </button>
        {/* v0.31.0 (t5u): a swipe can start from the right part of the name row; boxes respond only when crossed. */}
        <label className="more-row dev-name-swipe" style={{ position: 'relative' }}>
          Swipe from name
          <span className="meta">{NAME_SWIPE_OPTIONS.find((o) => o.value === normalizeNameSwipe(prefs['gestures.nameSwipeFrom']))!.label}</span>
          <select
            aria-label="Swipe from name"
            value={String(normalizeNameSwipe(prefs['gestures.nameSwipeFrom']))}
            onChange={(e) => setPref('gestures.nameSwipeFrom', normalizeNameSwipe(Number(e.target.value)))}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%' }}
          >
            {NAME_SWIPE_OPTIONS.map((o) => (
              <option key={o.value} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {/* v0.30.0 (t175u): pick the swipe pending cue; blue until Steve chooses. */}
        <label className="more-row dev-swipe-confirm" style={{ position: 'relative' }}>
          Swipe confirm
          <span className="meta">{SWIPE_CONFIRM_STYLES.find((s) => s.id === normalizeSwipeStyle(prefs['gestures.swipeConfirmStyle']))!.label}</span>
          <select
            aria-label="Swipe confirm"
            value={normalizeSwipeStyle(prefs['gestures.swipeConfirmStyle'])}
            onChange={(e) => setPref('gestures.swipeConfirmStyle', normalizeSwipeStyle(e.target.value))}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%' }}
          >
            {SWIPE_CONFIRM_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
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
        {/* v0.34.1 (t48u): bridge URL is built in; an override field on Join only when this is on. */}
        <button
          type="button"
          className="more-row dev-join-url"
          onClick={() => setPref('sync.joinUrlOverride', !prefs['sync.joinUrlOverride'])}
         role="switch" aria-checked={Boolean(prefs['sync.joinUrlOverride'])}>
          Bridge URL override on Join
          <span className={`toggle${prefs['sync.joinUrlOverride'] ? ' on' : ''}`} aria-hidden />
        </button>
      </div>

      <div className="more-sec">Chrome</div>
      <div className="more-card">
        <button
          type="button"
          className="more-row"
          onClick={() => setPref('chrome.showFab', !prefs['chrome.showFab'])}
         role="switch" aria-checked={Boolean(prefs['chrome.showFab'])}>
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
