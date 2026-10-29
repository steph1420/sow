import { useEffect, useState } from 'react'
import { markNudgeSeen, runInstallPrompt, shouldNudge, useInstallMode } from './install'
import '../more/more.css'

/** iOS: Share › Add to Home Screen steps (mock prefsync-mj1-c, locked t52u). */
export function IosStepsSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="sp-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sp-sheet" role="dialog" aria-modal="true" aria-label="Add SoW to your Home Screen">
        <div className="sp-grab" />
        <div className="sp-title">Add SoW to your Home Screen</div>
        <div className="sp-kv"><b>Step 1</b>Tap Share <span aria-hidden>⎋</span> in Safari’s toolbar</div>
        <div className="sp-kv"><b>Step 2</b>Scroll and tap “Add to Home Screen” ＋</div>
        <div className="sp-kv"><b>Step 3</b>Tap Add · open SoW from the new icon</div>
        <div className="sp-row-btn" style={{ paddingTop: 14 }}>
          <button type="button" className="sp-btn pri" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  )
}

/** Settings › App section. Renders nothing once installed / standalone / no install path. */
export function InstallSection() {
  const mode = useInstallMode()
  const [ios, setIos] = useState(false)
  if (mode === 'none') return null
  return (
    <>
      <div className="more-sec">App</div>
      <div className="more-card">
        <button
          type="button"
          className="more-row g-row-like install-row"
          onClick={() => { if (mode === 'ios') setIos(true); else void runInstallPrompt() }}
        >
          <span className="g-ico green" aria-hidden>⤓</span>
          <span className="g-body">
            <span className="g-title">Install as app</span>
            <span className="g-sub">Full screen · works offline · hidden once installed</span>
          </span>
          <span className="chev">›</span>
        </button>
      </div>
      {ios ? <IosStepsSheet onClose={() => setIos(false)} /> : null}
    </>
  )
}

/** One-time nudge (t52u "Once"): the seen flag is saved the moment it shows; it never returns. */
export function InstallNudge() {
  const mode = useInstallMode()
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)
  useEffect(() => {
    if (!show && shouldNudge(mode)) { markNudgeSeen(); setShow(true) }
  }, [mode, show])
  if (ios) return <IosStepsSheet onClose={() => setIos(false)} />
  if (!show || mode === 'none') return null
  return (
    <div className="sp-scrim" onClick={(e) => { if (e.target === e.currentTarget) setShow(false) }}>
      <div className="sp-sheet install-nudge" role="dialog" aria-modal="true" aria-label="Install SoW">
        <div className="sp-grab" />
        <div className="sp-title">Install SoW as an app?</div>
        <div className="more-hint" style={{ margin: '0 16px 10px' }}>Opens full screen and works offline. You can do it later in Settings › App.</div>
        <div className="sp-row-btn" style={{ paddingTop: 6 }}>
          <button type="button" className="sp-btn" onClick={() => setShow(false)}>Not now</button>
          <button
            type="button"
            className="sp-btn pri"
            onClick={() => { setShow(false); if (mode === 'ios') setIos(true); else void runInstallPrompt() }}
          >
            {mode === 'ios' ? 'Show me how' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  )
}
