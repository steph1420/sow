/** v0.44.0 Stable/Beta data source switch (per device). Stable = LIVE bridge; Beta = TEST copy bridge entered on this device.
 *  Each source has its own IndexedDB, so data never mixes. Read from localStorage because the DB name is needed before IDB opens. */
import { DEFAULT_SYNC_URL } from './defaultBridge'
export type Channel = 'stable' | 'beta'
export const CHANNEL_KEY = 'sow.channel'
export const BETA_URL_KEY = 'sow.betaUrl'
export const readChannel = (raw: string | null): Channel => (raw === 'beta' ? 'beta' : 'stable')
export const dbNameFor = (c: Channel) => (c === 'beta' ? 'sow-app-beta' : 'sow-app')
/** Beta never falls back to the LIVE url (stored LIVE url in a beta cache is ignored too). */
export function syncUrlFor(c: Channel, betaUrl: string | null, stored: string | null | undefined): string {
  if (c === 'stable') return (stored ?? '').trim() || DEFAULT_SYNC_URL
  const b = (betaUrl ?? '').trim()
  return b && b !== DEFAULT_SYNC_URL ? b : ''
}
const ls = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null } catch { return null } }
export const currentChannel = (): Channel => readChannel(ls()?.getItem(CHANNEL_KEY) ?? null)
export const currentBetaUrl = (): string => ls()?.getItem(BETA_URL_KEY) ?? ''
export function setChannel(c: Channel) { ls()?.setItem(CHANNEL_KEY, c) }
export function setBetaUrl(u: string) { ls()?.setItem(BETA_URL_KEY, u.trim()) }
