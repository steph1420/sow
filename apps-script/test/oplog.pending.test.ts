/** PENDING (docs/CRDT_SYNC_PLAN.md §4, §8, §9) — bridge op log; skipped until Q-CRDT is locked. */
import { describe, expect, it } from 'vitest'

describe.skip('bridge op log v0.37.0 (pending)', () => {
  it('migration copies every Ticks + Roster row into Base; state(Base) equals the old tabs cell for cell', () => { expect('migrateOplog_').toBe('implemented') })
  it('opsPush is idempotent by deviceId:seq and reports seq gaps', () => { expect('opsPush').toBe('implemented') })
  it('Entry checkbox edit becomes an op from device "sheet" with the server vector (causally after all synced ops)', () => { expect('entryEdit_ op').toBe('implemented') })
  it('legacy push (old app) after migration is concurrent and cannot override a causally newer op', () => { expect('legacy adapter').toBe('implemented') })
  it('stamps from the future never block later edits (recvAt is tiebreak only)', () => { expect('recvAt tiebreak').toBe('implemented') })
  it('true concurrency writes a Conflicts row', () => { expect('Conflicts').toBe('implemented') })
  it('pull still returns Ticks/Roster with updatedAt for old apps', () => { expect('pull compat').toBe('implemented') })
})
