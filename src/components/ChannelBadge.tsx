import { currentChannel } from '../sync/channel'
/** v0.44.0: shown only when this device reads the Beta (TEST copy) data source. */
export function ChannelBadge() {
  if (currentChannel() !== 'beta') return null
  return <span className="ch-badge" data-channel="beta" title="Beta data source: TEST copy sheet">BETA · TEST copy</span>
}
