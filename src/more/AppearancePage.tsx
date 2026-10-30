import { haptic, setHapticsLevel } from '../lib/haptics'
import { usePrefs } from '../prefs/PrefsContext'
import { PALETTES } from '../theme/palettes'
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
  const { prefs, setTheme, setPref, palette, setPalette } = usePrefs()
  const follow = prefs['theme.followSystem']
  const theme = prefs.theme

  return (
    <MoreChrome title="Appearance" onBack={onBack}>
      <div className="more-hint">Night is the field default · Day for bright rooms</div>

      {/* v0.35.0 (t48u, themepicker-mj1 LOCKED): colour theme above Mode; follows Night/Day. */}
      <div className="more-sec">Colour theme</div>
      <div className="more-card" role="radiogroup" aria-label="Colour theme">
        {PALETTES.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={palette === p.id}
            className="more-row palette-row"
            onClick={() => { setPalette(p.id); haptic('selection') }}
          >
            <span className="palette-sw" aria-hidden>
              {p.swatch.map((c, i) => <span key={i} style={{ background: c }} />)}
            </span>
            <span className="palette-name">{p.name}</span>
            {palette === p.id ? <span className="palette-check" aria-hidden>✓</span> : null}
          </button>
        ))}
      </div>
      <div className="more-hint">Swatches show the Night palette · follows the Night/Day switch</div>

      <div className="more-sec">Mode</div>
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
         role="switch" aria-checked={Boolean(follow)}>
          <span className="g-body">
            <span className="g-title">Follow system</span>
            <span className="g-sub">Match phone dark/light</span>
          </span>
          <span className={`toggle${follow ? ' on' : ''}`} aria-hidden />
        </button>
      </div>

      <div className="more-sec">Contrast</div>
      <div className="more-card contrast-card">
        <div className="contrast-row">
          <input
            type="range"
            min={-10}
            max={10}
            step={1}
            aria-label="Contrast"
            aria-valuetext={(() => { const v = Math.round((prefs['appearance.contrast'] ?? 0) * 10); return v === 0 ? 'Default' : v < 0 ? `Softer ${-v}` : `Stronger ${v}` })()}
            value={Math.round((prefs['appearance.contrast'] ?? 0) * 10)}
            onChange={(e) => setPref('appearance.contrast', Number(e.currentTarget.value) / 10)}
          />
          <div className="contrast-lbls" aria-hidden><span>Softer</span><span>Default</span><span>Stronger</span></div>
          <div className="g-sub">One setting for Night and Day · text and lines only, accent colours stay the same</div>
        </div>
      </div>

      <div className="more-sec">Checklist feel</div>
      <div className="more-card">
        <button
          type="button"
          className="more-row g-row-like"
          onClick={() => setPref('chrome.showFab', !prefs['chrome.showFab'])}
         role="switch" aria-checked={Boolean(prefs['chrome.showFab'])}>
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
        <button
          type="button"
          className="more-row g-row-like"
          onClick={() => setPref('az.hideEmpty', !prefs['az.hideEmpty'])}
         role="switch" aria-checked={Boolean(prefs['az.hideEmpty'])}>
          <span className="g-ico soft" aria-hidden>
            ∅
          </span>
          <span className="g-body">
            <span className="g-title">Hide dimmed letters</span>
            <span className="g-sub">Drop empty letters from strip</span>
          </span>
          <span className={`toggle${prefs['az.hideEmpty'] ? ' on' : ''}`} aria-hidden />
        </button>
      </div>

      <div className="more-sec">Comfort</div>
      <div className="more-card">
        <button
          type="button"
          className="more-row g-row-like"
          onClick={() => setPref('chrome.reduceMotion', !prefs['chrome.reduceMotion'])}
         role="switch" aria-checked={Boolean(prefs['chrome.reduceMotion'])}>
          <span className="g-ico teal" aria-hidden>
            ◎
          </span>
          <span className="g-body">
            <span className="g-title">Reduce motion</span>
            <span className="g-sub">Less glow on stroke · jump A–Z OK</span>
          </span>
          <span
            className={`toggle${prefs['chrome.reduceMotion'] ? ' on' : ''}`}
            aria-hidden
          />
        </button>
        <div className="more-row g-row-like haptics-row">
          <span className="g-body">
            <span className="g-title">Haptics</span>
            <span className="g-sub">Vibration strength · Android (iPhone can't vibrate from web)</span>
          </span>
        </div>
        <div className="haptics-seg" role="radiogroup" aria-label="Haptics intensity">
          {(['off', 'light', 'normal', 'strong'] as const).map((lv) => (
            <button
              key={lv}
              type="button"
              role="radio"
              aria-checked={prefs['haptics.level'] === lv}
              className={`haptics-opt${prefs['haptics.level'] === lv ? ' on' : ''}`}
              data-level={lv}
              onClick={() => {
                setPref('haptics.level', lv)
                setPref('haptics.enabled', lv !== 'off')
                setHapticsLevel(lv)
                haptic('medium')
              }}
            >
              {lv[0].toUpperCase() + lv.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </MoreChrome>
  )
}
