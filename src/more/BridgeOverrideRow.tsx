import { useState } from 'react'
import { maskUrl } from '../lib/maskUrl'
import { currentOverride, setOverride, validBridgeUrl } from '../sync/channel'

/** v0.46.0 (t7u "Dev opt"): bridge /exec override for this device — masked, validated, blank = built-in address. */
export function BridgeOverrideRow() {
  const [url, setUrl] = useState(currentOverride())
  const [foc, setFoc] = useState(false)
  const [saved, setSaved] = useState(currentOverride())
  const bad = !!url.trim() && !validBridgeUrl(url)
  return (
    <div className="more-card dev-bridge-override">
      <label className="ds-l">Bridge URL override (/exec)
        <input name="sow-bridge-override" className="ds-in" inputMode="url" autoComplete="off" placeholder="blank = built-in address"
          value={foc ? url : maskUrl(url)} aria-invalid={bad}
          onFocus={(e) => { e.currentTarget.value = url; setFoc(true) }} onChange={(e) => setUrl(e.target.value)}
          onBlur={() => { setFoc(false); if (!bad) { setOverride(url); setSaved(currentOverride()) } }} />
      </label>
      <div className="more-hint" role="status">
        {bad ? 'Not saved — must be https://script.google.com/macros/s/…/exec' : saved ? 'Override on · Sync uses this address' : 'Off · Sync uses the built-in address'}
      </div>
    </div>
  )
}
