/** v0.34.1 (t47u/t48u): Steve's Apps Script bridge address, built in so joining needs only the code.
 * Address only — not a secret. The token is never built in; it arrives via pairClaim.
 * v0.46.0 (t34u/t37u): LIVE bridge 0.46.2 is a NEW deployment → new address. */
export const DEFAULT_SYNC_URL =
  'https://script.google.com/macros/s/AKfycby2SaO9tEQC_-PgLyh7EaUoK7ganHAnXuizqYtMjSFW3qEhUcO5di6cB8czYf38PAD3/exec'

/** v0.46.0 (t34u): earlier built-in addresses. A phone that saved one of these (join, setup file, Sync page save) is on the
 *  built-in default, so it follows the current default. A Developer override is never rewritten (channel.ts). */
export const RETIRED_SYNC_URLS: readonly string[] = [
  'https://script.google.com/macros/s/AKfycbzmOQ__yxauJtrQ5LNxSqcEaDHjjbcZb-rzt0UuBQGVwXSURKRF1zbr6FvChAy7-hjqwA/exec',
]
export const isLiveDefault = (u: string | null | undefined): boolean => {
  const s = (u ?? '').trim()
  return s === DEFAULT_SYNC_URL || RETIRED_SYNC_URLS.includes(s)
}

export function effectiveSyncUrl(stored: string | undefined | null): string {
  const s = (stored ?? '').trim()
  return !s || RETIRED_SYNC_URLS.includes(s) ? DEFAULT_SYNC_URL : s
}
