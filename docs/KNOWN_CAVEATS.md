# Known caveats, trade-offs and potential glitches (v0.46.0 / bridge 0.46.2)
Noted 2026-11-01 (Steve t34u). To handle later.

## Known bugs
- **B-B4-1 Two tabs/windows open at once** can overwrite each other's ticks (stale grid in tab 2 writes old values with a newer stamp). Also in v0.45. Proposed fix: save only changed cells and refresh other tabs via BroadcastChannel.

## Trade-offs
- **Tombstone pruning (60 days, max 120):** a phone offline for more than 60 days could resurrect a deleted or renamed date.
- **Strict roll check:** ticks for a pupil removed from the Roster sheet are now rejected (shown as a sync note), not stored.
- **Stamp cap at server time:** a phone with a fast clock can no longer "win" by its clock. Edits are ordered by bridge arrival time after the offset correction.
- **Submitted mode resets to Set after reload** (by design).

## Potential glitches (seen once, not reproduced)
- Offline merge on device B matched 41/42 once, then 42/42 on re-runs (likely auto-sync timing).
- After ok:false/empty bridge replies, Sync showed "Local dirty: No" with no error before the beta.4 fix. Re-check on LIVE.
- Odd inputs saved loosely: a topic sent as an object becomes "[object Object]" (now rejected in 0.46.2; verify).

## Not yet tested
- Duplicate pupil names (needs two same-name pupils on the TEST Roster).
- Real devices (all touch tests ran in emulation at 412×915).
- Script Properties size under long real use (tombstone cap mitigates).
