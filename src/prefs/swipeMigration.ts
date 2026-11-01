/** v0.46.0-beta.2 (Steve t15u Q2 "migrate saved blue to trailing wash"): one time per device; a later pick of blue sticks. */
import { flavorKey } from '../sync/channel'
export const SWIPE_MIGRATION_KEY = flavorKey('sow-app.swipeWash.v046')
/** Blue rows synced from the sheet stamped before Steve's lock (2026-11-01 15:27 IST) are old defaults → wash. */
export const SWIPE_BLUE_CUTOFF = '2026-11-01T09:57:00.000Z'
export function migrateRemoteSwipeStyle<T>(value: T, stamp: string | undefined): T | 'wash' {
  return value === 'blue' && (!stamp || stamp < SWIPE_BLUE_CUTOFF) ? 'wash' : value
}
