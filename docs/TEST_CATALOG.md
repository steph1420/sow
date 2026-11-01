# SoW test catalog (Steve t29u, 2026-11-01)

Every test run so far, with its purpose, how to run it, what to expect and how to restore the TEST copy. **TEST copy only**, never LIVE. The token comes from `SOW_TEST_BRIDGE_TOKEN` and is never printed.

**Run everything:** `npx vite preview --port 4179 &` then `tests/adv/run-all.sh [unit|bridge|probes|browser|all]`. Each part logs one line to `/workspace/sow-build/progress.log`. Output goes to `/workspace/sow-build/adv/`.

**Loop rule (t24u):** a bug is logged, never a reason to stop. Each script has a 3-minute no-progress watchdog. A step is retried at most once, and only after a change.

**TEST baseline:** 7 sessions, 311 tick rows, 216 ticked, 89 pupils (3 Left), 4 subjects, no Submitted flags.
- Raw copy: `/workspace/sow-build/adv/raw-baseline.json`. Compared against `/workspace/sow-measure/baseline-snapshot.json`.
- **Restore:** `restore()` in `tests/adv/bridgeLib.mjs` runs automatically after every group:
  - deletes any session that isn't in the baseline,
  - pushes the baseline Set value and clears the Submitted flags for every changed tick,
  - pushes the baseline Left/Active status.
- It stamps the restore 1 s later than the newest stamp on the sheet, so a future "poisoned" stamp (bug B-0462-1) can't block it.
- It then calls `verifyBaseline()` and exits with code 42 if the sheet doesn't match.
- **Manual check:** `cd tests/adv && node -e "import('./bridgeLib.mjs').then(async m=>{await m.guard();console.log(await m.verifyBaseline())})"`.
- Every script calls `guard()` first, which refuses to run unless the bridge reports the TEST sheet id.

## 1. Unit tests (no network)
| Suite | Purpose | Run | Expect |
|---|---|---|---|
| `src/**/*.test.ts` | app logic: sync merge, Submitted, swipe path, wash direction, A–Z grip, snapshots, bad bridge replies (`src/sync/badReply.test.ts`) | `npx vitest run src` | all pass |
| `apps-script/test/*.test.ts` | Code.js in a mock spreadsheet: push/pull, clock guard, structs/tombstones, pairing, prefs, v0.46 (`v046.test.ts`), 0.46.2 fixes (`v0462.test.ts`) | `npx vitest run apps-script` | all pass (7 skipped = pending op-log/CRDT specs) |

## 2. Bridge run 1: `tests/adv/bridge-adversarial.mjs` (real TEST bridge)
`node tests/adv/bridge-adversarial.mjs`. It restores after the invalid-date test, after the cell tests and at the end.
| Test | Expect |
|---|---|
| ping version on the TEST sheet | `0.46.2` once pasted (the script still checks for 0.46.1; update that line after the paste) |
| bad token on pull/push; non-JSON body; unknown action | rejected, no write |
| 6 garbage ticks (bad date, roll 0/−3/'x', unknown subject, no stamp) | all rejected, no rows created |
| roster op for an unknown pupil | rejected |
| 2027-02-30 tick | rejected (FAILS on 0.46.1: B-0462-2) |
| two devices on the same cell, AB and BA order | newer edit wins |
| offline op from 2 h ago | loses to the newer sheet value |
| phone clock −2h/−1d/+2h/+1d | newer real edit wins, stamp corrected, next honest edit still applies |
| 0.44-style +1 day stamp | clamped |
| 3 concurrent duplicate pushes | applied once, no duplicate rows |
| replayed op with clientNow −5 min | must not poison the cell (B-0462-1, passes on 0.46.2). Runs once: `run-all.sh` skips it (`ADV_SKIP_REPLAY=1`) unless `ADV_REPLAY=1` |
| old-style push keeps manual Submitted; subOff only while Set on; subs migration sets J only | pass (the run-1 fails were knock-ons from B-0462-1) |
| resend of all 311 ticks with their own stamps | all ignored, baseline intact |

## 3. Bridge run 2: `tests/adv/bridge-adv2.mjs` (real TEST bridge)
`node tests/adv/bridge-adv2.mjs`. It restores after each group. On 0.46.1: 23 pass, 7 fail.
| Group | Tests | Expect on 0.46.2 |
|---|---|---|
| left-two-devices | Left/Active from two phones in both orders; +1 day phone; status "Gone" | newer wins; stamp corrected; "Gone" **rejected** (0.46.1 counted it as applied) |
| unicode-huge-topic | 5000-char Hindi/Hebrew/emoji topic; topics `=1+1`, `+2+3`, `@SUM(1)`, `'=quoted`; null/object topic | clipped to 200 characters without breaking an emoji; topics stored literally (B-0462-3); object topic **rejected** |
| phantom-rolls | rolls 999, 1.5, 1e9, "7" | only "7" is accepted (B-0462-4) |
| year-wrap | 31 Mar, 1 Apr, 31 Dec, 1 Jan; 31 Apr, month 13, month 0 | exact dates; impossible ones rejected (B-0462-2) |
| rename-vs-tick | rename vs older/newer tick on the old date; rename onto an existing date; delete vs older tick+topic; impossible-date rename/delete; rename + tick in one push | as in the script; impossible dates rejected |
| rename-baseline-and-back | real session renamed away and back | ticks and topic intact |
| tombstone-prune | (0.46.2) delete stamped 90 days ago, then an older tick: accepted (tomb pruned); 30 days ago: ignored (kept). Uses fresh random dates each run | both pass |
| resend-all | 311 ticks with own stamps / fresh stamps | all ignored / all applied with values unchanged |

Column I `pupilStatus` can't drift out of line with its row. It's one `ARRAYFORMULA` that recalculates per row, and the bridge never writes it. A rename away and back leaves every tick row as it was.

## 4. Existing e2e probes: `tests/e2e/*.cjs` (412×915, real touch through CDP)
Run one with `node tests/e2e/<probe> http://localhost:4179/sow/`. The sync probes use Beta + TEST and need the token.

| Probe | Purpose | Last result |
|---|---|---|
| offline-sync | offline notice, Sync disabled, kept after reload | 8/8 |
| sync-flow | fresh install pulls from TEST, History lists 7 dates | 7/7 |
| submitted-derived | faded auto Submitted, tap → off + Undo toast, manual survives reload | 10/10 |
| reload | state survives reload | 10/10 |
| sw-update | old SW → new build auto-reloads on resume. It rebuilds dist and ends with `npm run build`, so the build must be green | 3/3 |
| swipe-confirm / swipe-path / swipe-single | every cue style, lit boxes, going back cancels | 68 / 10 / 7 |
| name-swipe-setting | nameSwipeFrom Off/30/50/70 | 16/16 |
| topic-sync | topic edits sync | 7/7 |
| az-tween | A–Z tap scroll tween (W down, A up, bottom stays in range, rapid scrub) + grip present. Asserts since beta.4 | 5/5 |

## 5. Browser break-it 1: `tests/adv/browser-adv.cjs` (beta.3 build + TEST)
`ADV_GROUPS=a,b node tests/adv/browser-adv.cjs <url>` runs a subset. Restores after each group. Last full run: 26/26.
- **malformed-responses:** the push reply is replaced with an HTML login page, HTTP 500, truncated JSON, `{ok:true}`, `ok:false`, an empty body or wrong types. The app must stay alive and keep the local ticks, and the next real sync must match the sheet. (Since beta.4, a reply without a state is an error and stays dirty.)
- **network-flap:** connection reset during push, offline/online flaps, then sync. The app column must equal the sheet session.
- **tick-storm-during-push:** 9 taps during a 6 s push, then sync twice. Must agree with the sheet.
- **reload-mid-push:** the tick survives the reload and the next sync agrees.
- **two-devices-offline:** both phones edit offline, including the same cell. Both converge on the later edit and both match the sheet.
- **snapshot-restore-then-sync:** "Back up now", change and sync, restore the manual snapshot. The restored value is pushed. A reload mid-restore leaves the list intact.
- **swipe-and-submitted-edges:** touchcancel commits nothing; a second finger causes no crash; dragging off-screen leaves the app alive. Submitted: tap auto → off → Undo → reload keeps auto. Submitted mode resets to Set on reload by design, so re-enter it with M. Manual-off reaches the sheet (J FALSE).

## 6. Browser break-it 2: `tests/adv/browser-adv2.cjs` (beta.4 build; added t29u)
| Group | Purpose | Sheet |
|---|---|---|
| grip | Q-AZ-1 B: grip ≥ 44 px; drag past the middle snaps to the nearest edge; survives reload; a plain tap does nothing; doesn't cover A; Enter key; scrub still works | demo |
| wash-direction | t23u: wash trails from the left going right and flips to trail from the right going left; 1 px jitter doesn't flip it; cleared on cancel | demo |
| app-killed-mid-swipe | page closed mid-swipe, reopened: nothing half-committed | demo |
| submitted-rapid | 15 rapid Submitted taps: no lost taps, few toasts, state survives reload | demo |
| two-tabs | two tabs tick different cells: both kept. **FAILS: B-B4-1** (the stale tab writes the old value back) | demo |
| storage-quota | IndexedDB quota set to 1 byte through CDP: app keeps running; after the quota returns the next tick saves | demo |
| timezones | IST (box zone; no context timezoneId, so the CDP override can switch to New York) / Los Angeles / Kiritimati show the same dates; switching IST→New York after a sync lands the tick on the same session | TEST |
| slow-3g | 2 s latency at 50 kbit/s: sync completes and the tick reaches the sheet | TEST |
| clock-rollback | phone clock 3 h behind after a sync: the new tick still wins | TEST |

## 7. 0.46.2 on TEST (t32u, 10:02 PM IST)
Verified: run 1 44/44 (replay and 30 Feb included), run 2 32/32, then `run-all.sh all` once (run 1 43/43 without the replay; run 2's tombstone test failed only because it reused dates, and passed after switching to fresh dates). Still open:
- Re-run bridge run 1 (replay test **once**) and run 2: all expected to pass.
- Duplicate pupil names: needs two pupils with the same name on the TEST Roster. Steve adds them; the bridge never invents pupils. Then check that ticks key on roll, not name.
- Tombstone pruning on the real Script Properties: 0.46.2 prunes on the next rename/delete.
