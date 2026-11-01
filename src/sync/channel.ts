/** v0.44.0 Stable/Beta data source switch (per device). Stable = LIVE bridge; Beta = TEST copy bridge entered on this device.
 *  Each source has its own IndexedDB, so data never mixes. Read from localStorage because the DB name is needed before IDB opens. */
import { DEFAULT_SYNC_URL } from './defaultBridge'
import { TEST_EXEC_URL } from './sheets'
export type Channel = 'stable' | 'beta'
export const CHANNEL_KEY = 'sow.channel'
export const BETA_URL_KEY = 'sow.betaUrl'
export const readChannel = (raw: string | null): Channel => (raw === 'beta' ? 'beta' : 'stable')
/** v0.46.0 (t8u): the separate Beta site (/sow-beta/, VITE_SOW_FLAVOR=beta) is always Beta, defaults to the TEST /exec,
 *  keeps its own IndexedDB and prefixes its localStorage keys — it shares the github.io origin with Stable and must never
 *  flip Stable's channel. */
export type FlavorDefaults = { channel: Channel; betaUrl: string; dbName: string; keyPrefix: string }
export function betaFlavorDefaults(flavor: string | undefined): FlavorDefaults | null {
  return flavor === 'beta' ? { channel: 'beta', betaUrl: TEST_EXEC_URL, dbName: 'sow-beta', keyPrefix: 'sow-beta.' } : null
}
const FLAVOR = betaFlavorDefaults(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SOW_FLAVOR : undefined)
export const isBetaSite = (): boolean => FLAVOR !== null
export const dbNameFor = (c: Channel) => (FLAVOR ? FLAVOR.dbName : c === 'beta' ? 'sow-app-beta' : 'sow-app')
/** v0.46.0 (t7u): Developer bridge URL override — only a script.google.com …/exec address is accepted. */
export const validBridgeUrl = (u: string | null | undefined): boolean => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test((u ?? '').trim())
/** Beta never falls back to the LIVE url (stored LIVE url in a beta cache is ignored too). A valid Developer override wins. */
export function syncUrlFor(c: Channel, betaUrl: string | null, stored: string | null | undefined, override?: string | null): string {
  if (validBridgeUrl(override)) return override!.trim()
  if (c === 'stable') return (stored ?? '').trim() || DEFAULT_SYNC_URL
  const b = (betaUrl ?? '').trim()
  return b && b !== DEFAULT_SYNC_URL ? b : ''
}
const ls = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null } catch { return null } }
/** localStorage key scoped to this site (the Beta site prefixes its keys; Stable keys are unchanged). */
export const flavorKey = (k: string) => (FLAVOR ? FLAVOR.keyPrefix + k : k)
const key = flavorKey
export const currentChannel = (): Channel => (FLAVOR ? FLAVOR.channel : readChannel(ls()?.getItem(CHANNEL_KEY) ?? null))
export const currentBetaUrl = (): string => ls()?.getItem(key(BETA_URL_KEY)) || (FLAVOR ? FLAVOR.betaUrl : '')
export function setChannel(c: Channel) { if (!FLAVOR) ls()?.setItem(CHANNEL_KEY, c) }
export function setBetaUrl(u: string) { ls()?.setItem(key(BETA_URL_KEY), u.trim()) }
export const OVERRIDE_KEY = 'sow.bridgeOverride'
export const currentOverride = (): string => ls()?.getItem(key(OVERRIDE_KEY)) ?? ''
export function setOverride(u: string) { const v = u.trim(); if (!v) ls()?.removeItem(key(OVERRIDE_KEY)); else if (validBridgeUrl(v)) ls()?.setItem(key(OVERRIDE_KEY), v) }
