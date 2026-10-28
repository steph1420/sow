import { MoreChrome } from './MoreChrome'
import './more.css'

type Props = {
  onBack: () => void
  onOpenDev: () => void
  onOpenSync: () => void
  onOpenAppearance: () => void
  onOpenSubjects: () => void
  onOpenRoster: () => void
  onOpenHistory: () => void
  onOpenAbout: () => void
}

/**
 * Settings home — ColorOS-soft hero tiles + Classroom / System (pretty-mj3).
 * No Soft-green toggle · no Marking-defaults duplicate.
 */
export function SettingsPage({
  onBack,
  onOpenDev,
  onOpenSync,
  onOpenAppearance,
  onOpenSubjects,
  onOpenRoster,
  onOpenHistory,
  onOpenAbout,
}: Props) {
  return (
    <MoreChrome title="Settings" onBack={onBack}>
      <div className="more-hint">Marking · sync · look & feel · teacher tools</div>

      <div className="hero-grid">
        <button type="button" className="hero-card" onClick={onOpenSync}>
          <span className="glow" style={{ background: '#30d158' }} />
          <div className="hc-ico" style={{ background: 'linear-gradient(145deg,#2ecc71,#1fa855)' }}>
            ⟳
          </div>
          <div>
            <div className="hc-label">
              Sync <span className="chev">›</span>
            </div>
            <div className="hc-sub">Sheet · subjects</div>
          </div>
        </button>
        <button type="button" className="hero-card" onClick={onOpenAppearance}>
          <span className="glow" style={{ background: '#8b7cf7' }} />
          <div className="hc-ico" style={{ background: 'linear-gradient(145deg,#8b7cf7,#6c5ce7)' }}>
            ◐
          </div>
          <div>
            <div className="hc-label">
              Appearance <span className="chev">›</span>
            </div>
            <div className="hc-sub">Night · Day</div>
          </div>
        </button>
        <button type="button" className="hero-card wide" onClick={onOpenSubjects}>
          <div className="hc-ico soft">☰</div>
          <div style={{ flex: 1 }}>
            <div className="hc-label">
              Subjects & sheets <span className="chev">›</span>
            </div>
            <div className="hc-sub">Eng · Math · Sci · manage tabs</div>
          </div>
        </button>
      </div>

      <div className="more-sec">Classroom</div>
      <div className="more-card">
        <button type="button" className="more-row g-row-like" onClick={onOpenRoster}>
          <span className="g-ico teal" aria-hidden>
            ◎
          </span>
          <span className="g-body">
            <span className="g-title">Roster</span>
            <span className="g-sub">KGA · KGB · rolls</span>
          </span>
          <span className="chev">›</span>
        </button>
        <button type="button" className="more-row g-row-like" onClick={onOpenHistory}>
          <span className="g-ico orange" aria-hidden>
            ◷
          </span>
          <span className="g-body">
            <span className="g-title">History</span>
            <span className="g-sub">Past mark sessions</span>
          </span>
          <span className="chev">›</span>
        </button>
      </div>

      <div className="more-sec">System</div>
      <div className="more-card">
        <button type="button" className="more-row g-row-like" onClick={onOpenDev}>
          <span className="g-ico soft" aria-hidden>
            ⚙
          </span>
          <span className="g-body">
            <span className="g-title">Dev options</span>
            <span className="g-sub">Demo data · diagnostics</span>
          </span>
          <span className="chev">›</span>
        </button>
        <button type="button" className="more-row g-row-like" onClick={onOpenAbout}>
          <span className="g-ico soft" aria-hidden>
            ?
          </span>
          <span className="g-body">
            <span className="g-title">About</span>
            <span className="g-sub">v0.24.0 · Quiet Lucid</span>
          </span>
          <span className="chev">›</span>
        </button>
      </div>
    </MoreChrome>
  )
}
