/** v0.34.1 (t47u/t48u): Steve's Apps Script bridge address, built in so joining needs only the code.
 * Address only — not a secret. The token is never built in; it arrives via pairClaim. */
export const DEFAULT_SYNC_URL =
  'https://script.google.com/macros/s/AKfycbzmOQ__yxauJtrQ5LNxSqcEaDHjjbcZb-rzt0UuBQGVwXSURKRF1zbr6FvChAy7-hjqwA/exec'

export function effectiveSyncUrl(stored: string | undefined | null): string {
  const s = (stored ?? '').trim()
  return s || DEFAULT_SYNC_URL
}
