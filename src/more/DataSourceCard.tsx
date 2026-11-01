import { useState } from 'react'
import { maskUrl } from '../lib/maskUrl'
import { ChannelBadge } from '../components/ChannelBadge'
import { BETA_URL_KEY, currentBetaUrl, currentChannel, isBetaSite, setBetaUrl, setChannel, type Channel } from '../sync/channel'

/** v0.44.0 Stable/Beta switch (this device only). Stable = LIVE sheet bridge (built in). Beta = TEST copy bridge URL typed here.
 *  Each source keeps its own local data; switching reloads the app onto the other cache. */
export function DataSourceCard() {
  const ch = currentChannel()
  const [url, setUrl] = useState(currentBetaUrl())
  const [foc, setFoc] = useState(false)
  const valid = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url.trim())
  const go = (c: Channel) => { if (c === ch) return; setChannel(c); window.dispatchEvent(new Event('sow:flush')); window.location.reload() }
  // v0.46.0 (t8u): the separate Beta site is always the TEST copy — no switch (it must never flip the Stable app).
  if (isBetaSite()) return (
    <section className="sy-card ds-card" aria-label="Data source">
      <div className="ds-h"><span>Data source<ChannelBadge /></span></div>
      <div className="ds-note">Beta app · always the TEST copy sheet. Your Stable app and its data are separate.</div>
    </section>
  )
  return (
    <section className="sy-card ds-card" aria-label="Data source">
      <div className="ds-h"><span>Data source<ChannelBadge /></span> <span className="ds-dev">this device</span></div>
      <div className="ds-seg" role="radiogroup" aria-label="Data source">
        <button type="button" role="radio" aria-checked={ch === 'stable'} className={ch === 'stable' ? 'on' : ''} onClick={() => go('stable')}>Stable · Live sheet</button>
        <button type="button" role="radio" aria-checked={ch === 'beta'} className={ch === 'beta' ? 'on beta' : ''} disabled={!valid && ch !== 'beta'} onClick={() => go('beta')}>Beta · TEST copy</button>
      </div>
      <label className="ds-l">TEST copy bridge URL (/exec)
        <input name={BETA_URL_KEY} className="ds-in" inputMode="url" placeholder="https://script.google.com/macros/s/…/exec" value={foc ? url : maskUrl(url)} data-testid="beta-url"
          onFocus={(e) => { e.currentTarget.value = url; e.currentTarget.select(); setFoc(true) }} onChange={(e) => setUrl(e.target.value)} onBlur={() => { setFoc(false); if (valid || !url.trim()) setBetaUrl(url) }} />
      </label>
      <div className="ds-note">
        {ch === 'beta' ? (valid ? 'Using the TEST copy. Its data is kept apart from Live on this device.' : 'Beta has no TEST copy URL yet — Sync stays off until you add one.')
          : valid ? 'Live data. Switching to Beta opens a separate, empty TEST cache.' : 'Paste the TEST copy /exec URL to enable Beta.'}
      </div>
    </section>
  )
}
