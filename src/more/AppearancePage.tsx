import { usePrefs } from '../prefs/PrefsContext'
import { MoreChrome } from './MoreChrome'
import './more.css'

type Props = {
  onBack: () => void
  onOpenAzDev: () => void
}

/**
 * Appearance — Night/Day phone pickers + Checklist feel (pretty-mj4).
 * No Soft-green toggle (dropped in triangulation).
 */
export function AppearancePage({ onBack, onOpenAzDev }: Props) {
  const { prefs, setTheme, setPref } = usePrefs()
  const follow = prefs['theme.followSystem']
  const theme = prefs.theme

  return (
    <MoreChrome title="Appearance" onBack={onBack}>
      <div className="more-hint">Night is the field default · Day for bright rooms</div>

      <div className="more-sec">Theme</div>
      <div className="more-card theme-card">
        <div className="theme-pick">
          <button
            type="button"
            className="theme-opt"
            onClick={() => setTheme('day')}
            aria-pressed={theme === 'day' && !follow}
          >
            <div className={`theme-phone light${theme === 'day' && !follow ? ' on' : ''}`}>
              <div className="mini-bar" />
              <div className="mini-row" />
              <div className="mini-row" />
              <div className="mini-row" style={{ width: '60%' }} />
            </div>
            <span className={`theme-radio${theme === 'day' && !follow ? ' on' : ''}`} />
            <span className={`theme-name${theme === 'day' && !follow ? ' on' : ''}`}>Day</span>
          </button>
          <button
            type="button"
            className="theme-opt"
            onClick={() => setTheme('night')}
            aria-pressed={theme === 'night' && !follow}
          >
            <div className={`theme-phone dark${theme === 'night' && !follow ? ' on' : ''}`}>
              <div className="mini-bar" />
              <div className="mini-row" />
              <div className="mini-row" style={{ background: 'rgba(48,209,88,.25)' }} />
              <div className="mini-row" style={{ width: '55%' }} />
            </div>
            <span className={`theme-radio${theme === 'night' && !follow ? ' on' : ''}`} />
            <span className={`theme-name${theme === 'night' && !follow ? ' on' : ''}`}>Night</span>
          </button>
        </div>
        <button
          type="button"
          className="more-row g-row-like"
          onClick={() => setPref('theme.followSystem', !follow)}
        >
          <span className="g-body">
            <span className="g-title">Follow system</span>
            <span className="g-sub">Match phone dark/light</span>
          </span>
          <span className={`toggle${follow ? ' on' : ''}`} aria-hidden />
        </button>
      </div>

      <div className="more-sec">Checklist feel</div>
      <div className="more-card">
        <button
          type="button"
          className="more-row g-row-like"
          onClick={() => setPref('chrome.showFab', !prefs['chrome.showFab'])}
        >
          <span className="g-ico soft" aria-hidden>
            ✦
          </span>
          <span className="g-body">
            <span className="g-title">FAB</span>
            <span className="g-sub">Off by default</span>
          </span>
          <span className={`toggle${prefs['chrome.showFab'] ? ' on' : ''}`} aria-hidden />
        </button>
        <button type="button" className="more-row g-row-like" onClick={onOpenAzDev}>
          <span className="g-ico" style={{ background: 'linear-gradient(145deg,#8b7cf7,#6c5ce7)' }} aria-hidden>
            A
          </span>
          <span className="g-body">
            <span className="g-title">A–Z strip</span>
            <span className="g-sub">Idle width 42</span>
          </span>
          <span className="chev">›</span>
        </button>
      </div>

      <div className="more-sec">Comfort</div>
      <div className="more-card">
        <button
          type="button"
          className="more-row g-row-like"
          onClick={() => setPref('chrome.reduceMotion', !prefs['chrome.reduceMotion'])}
        >
          <span className="g-ico teal" aria-hidden>
            ◎
          </span>
          <span className="g-body">
            <span className="g-title">Reduce motion</span>
            <span className="g-sub">Less glow on stroke</span>
          </span>
          <span
            className={`toggle${prefs['chrome.reduceMotion'] ? ' on' : ''}`}
            aria-hidden
          />
        </button>
      </div>
    </MoreChrome>
  )
}
