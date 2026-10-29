# CRDT / op-log sync — plan (PLAN ONLY, nothing built)

Request: Steve t54u "Vector clocks or CRDTs — I'm mainly concerned for data - ticks and all". Status: **LOCKED t55u** (Q-CRDT-1…9, see §12). Base: v0.36.0 (`f5010e4`).
Pending specs (skipped, show the cases): `src/sync/crdt.pending.test.ts`, `apps-script/test/oplog.pending.test.ts`.

## 1. Today's model and how it breaks
Every write carries a **wall-clock** `updatedAt` from the device that made it (`src/data/api.ts:6` `const now = () => new Date().toISOString()`), and every merge compares those strings.

| Where | Rule | Code |
|---|---|---|
| Bridge, ticks | stored `updatedAt >= incoming` → ignore ("per-tick newer wins") | `apps-script/Code.js:218` |
| Bridge, Left | same for Roster `updatedAt` | `Code.js:233` |
| Bridge, Entry tab edits | stamped with the **Apps Script** clock `now`, pushed through the same rule | `Code.js:391-394` (`entryEdit_` → `applyPush_(…, 'sheet')`) |
| App push selection | ticks with `updatedAt > bridgeSyncAt` are sent | `src/sync/bridge.ts:76`, `engine.ts:371` |
| App pull, Left | local kept if `cur.updatedAt > l.updatedAt` | `src/sync/engine.ts:345` |
| App pull, ticks | local kept if `cur.updatedAt > m.updatedAt && set differs` | `engine.ts:351` |
| Prefs (v0.36.0) | per-key `updatedAt >` | `Code.js:307` |

Failure cases:
1. **Clock ahead (phone +1 day):** its ticks carry tomorrow's stamp. Every later honest change (other phone, Entry tab) is *older* and is silently ignored at `Code.js:218` until real time passes the bad stamp. A wrong tick can't be un-ticked for a day. Same for Left (`:233`).
2. **Clock behind (−1 day):** its genuine new edits are ignored on arrival (`ignored++`) — the teacher sees "synced" but the tick is lost on the sheet; next pull at `engine.ts:351` may also overwrite it locally.
3. **Missed pushes:** `bridgeSyncAt` (`bridge.ts:76`) is a device-clock instant; if the clock jumps backward after a sync, edits stamped before `bridgeSyncAt` are never pushed.
4. **Offline concurrency:** phone A ticks roll 5 at 10:00 offline, phone B un-ticks roll 5 at 10:05 offline; whichever clock says later wins regardless of who saw what. There is no record that a conflict happened.
5. **Entry vs device:** Entry uses the server clock, devices use theirs → mixed clock domains in one comparison.
6. Ties: `>=` makes the stored value win an exact tie; the app side uses strict `>` — asymmetric.

## 2. Proposed model — op log + causal order
- **deviceId**: random id per install (already exists for prefs, `sow-app.prefsync.v1`). Entry/hand edits use device **`sheet`**.
- **Op**: `{opId, deviceId, seq, lamport, vv?, kind, target, value, wallAt, recvAt}`
  - `seq` per-device counter (1,2,3…) → gaps detect missing ops; idempotent by `opId = deviceId:seq`.
  - `lamport` = max(lamport seen) + 1 on each local op (cheap, total order with deviceId tiebreak).
  - `vv` (version vector `{deviceId: lastSeqSeen}`) recorded on each op = what the device had seen when it made the op → lets us tell "after" from "concurrent". Few devices (2–4) so vectors stay tiny.
  - `wallAt` (device clock) **display only**. `recvAt` (Apps Script clock at receipt) — **tiebreak only**, never ordering.
- **Kinds**: `tick.set` (target `subjectKey|date|roll`, value true/false), `left.set` (target `classKey|roll`, value Left/Active), `session.topic`, later `pref.set`.
- **State = fold(log)** on both sides: the Ticks/Roster tabs become a *materialized view* the bridge rewrites from the log; the app keeps its IDB tables as a view too.
- **Order between two ops on the same target**: if A's vv ⊇ B (A saw B) → A wins. Else **concurrent** → field rule:
  - **Ticks**: default **Set-wins** (add-wins: true beats false on true concurrency — a teacher never loses a "done"). Developer options: *Tick conflicts → Set wins / Unset wins / Latest receipt wins*.
  - **Left**: LWW by causal order; on true concurrency the **sheet wins** (device `sheet` op beats device ops — matches the v0.29.2 rule "otherwise the sheet wins", `docs/CODE_TRIANGULATION_v0292.md` Q-FIX-2 row); between two devices, higher `lamport`, then later `recvAt`, then deviceId.
- Clock skew becomes harmless: no ordering decision reads a device clock.

## 3. Conflict flagging
- Every true-concurrency resolution writes a `Conflicts` row (hidden tab): target, both values, both deviceIds, winner, rule, recvAt. App: Sync page "2 conflicts resolved · Review" list (read-only; tap to flip = a new op). Nothing blocks sync.

## 4. Migration (no data loss)
- One-time bridge `migrateOplog_`: copies **every** Ticks row and Roster Left state into a **base snapshot** (`Base` hidden tab, plus a Drive backup .xlsx as for Remove subject). Each base row = op from device `base` with `lamport 0` and the old `updatedAt` as `wallAt`. Any later op beats base.
- App: on first v0.40 sync, local marks/Left that differ from the sheet baseline (`sheetSet`, `bridge.ts:76` logic) become local ops `seq 1…n` with vv `{}` → treated as concurrent with base → Set-wins/sheet-wins rules apply; a conflict row records each.
- Old `updatedAt` columns stay (read by old apps, see §8).

## 5. Entry tab / hand edits
- `onEdit` → op from device `sheet`, `seq` from a Script Property counter under LockService, vv = the server's current vector (the sheet has seen everything the server has) → a sheet edit is causally after everything synced before it. `recvAt` = server clock.

## 6. Prefs
- Switch v0.36.0 per-key `updatedAt` to per-key `{version: lamport, deviceId, recvAt}`; same causal rule, whole category stamped together; unknown keys kept as today.

## 7. Compaction and limits
- Log tab `Ops` (hidden). When every known device's vv has acknowledged seq ≥ N (or 60 days pass), fold ops into `Base` and delete them. Devices not seen for 60 days are dropped from the vector (they resync from Base: their unsent ops still apply as concurrent).
- Limits: ~89 pupils × 4 subjects × ~200 days ≈ 70k tick targets/year; ops before compaction keep ≲ 20k rows. Apps Script: 6-min execution + 10M cells/sheet → push batch ≤ 500 ops; app-side log trimmed to unacked ops.

## 8. Backward compatibility
- Bridge keeps `push`/`pull` (wall-clock) for old apps: an old-style push becomes ops from device `legacy:<token-hash>` with vv = `{}` (concurrent with everything) → Set-wins/sheet-wins, never silently overwrites newer causal data. `pull` keeps returning Ticks/Roster views with `updatedAt` (= recvAt of the winning op).
- New action names `opsPush`/`opsPull`; old bridge → app shows "Update bridge script" and keeps the v0.36 path (as prefs did).

## 9. Test plan (failing tests first)
Unit (app `src/sync/crdt.test.ts`, bridge `apps-script/test/oplog.test.ts`) — skipped drafts already in repo:
1. A's clock +1 day ticks; B (correct clock) un-ticks *after seeing* A's tick → B wins.
2. Same with A −1 day → A's later op still applied (not "ignored").
3. Offline concurrent tick/untick → Set wins (default); Unset-wins when the dev option says so; a conflict row is written.
4. Left concurrent device vs Entry/sheet → sheet wins; device vs device → higher lamport.
5. Duplicate op (retry) → idempotent. Gap in seq → bridge asks for resend.
6. Migration: every old Ticks/Roster row present in Base; state(base) == old tabs, cell for cell.
7. Old app `push` after migration can't override a causally newer op.
8. Compaction: fold + delete keeps state identical.
9. Clock jumps backward after sync → no edit is skipped (replaces `bridgeSyncAt`).
Copy-sheet e2e (`tests/e2e/crdt-skew-e2e.cjs`, sheet `1vGXltIwxto-KGZr1ygSDk9EEM0m5rkLySXshZMdv4UQ`, only after Steve redeploys):
- two browser contexts = 2 devices; device B with `Date` faked to +1 day (`addInitScript`); both go offline (`context.setOffline(true)`); A ticks rolls 1–3, B un-ticks roll 2 and marks roll 7 Left; Entry tab ticks roll 4 via the Sheets connector; both come online and sync twice. Expect: rolls 1,3,4 Set; roll 2 per rule (Set-wins → Set) with 1 conflict row; roll 7 Left; both devices and the Ticks tab identical; then revert the test ops on the copy.

## 10. Size and phasing
- **v0.40.0** bridge: Ops/Base/Conflicts tabs, opsPush/opsPull, migration, legacy adapter (~350 lines Apps Script) + app op log, vv, fold, conflicts UI, dev option (~600–800 lines) + ~40 unit tests + skew e2e. Two evenings. Needs Code.js re-paste + New version + one-time "SoW › Migrate to op log" (backup first).
- **v0.40.1**: prefs on versions; compaction job (time trigger).
- Phase 0 (can ship first, small, v0.36.1): stop the worst damage now — bridge rejects stamps > server now + 10 min (clamps to recvAt) and app warns "Phone clock is off by X". ~60 lines.

## 11. Open questions (Q-CRDT)
1. **Q-CRDT-1** Ship the small clock-guard (v0.36.1) first, before the full op log?
2. **Q-CRDT-2** Tick conflicts default **Set wins**? (other choices in Developer options: Unset wins, Latest receipt wins)
3. **Q-CRDT-3** Left on true ties: **sheet wins** (as before); between two phones: later receipt — OK?
4. **Q-CRDT-4** Show resolved conflicts in the app (Sync › Review), or only log them on the sheet?
5. **Q-CRDT-5** Keep the op log 60 days before folding into the base?
6. **Q-CRDT-6** Old app versions after migration: allow their pushes (treated as concurrent) or refuse with "Update the app"?
7. **Q-CRDT-7** Migration: one menu click "SoW › Migrate to op log" with a Drive backup first — OK?
8. **Q-CRDT-8** Topics/session edits also on the op log now, or ticks + Left only first?
9. **Q-CRDT-9** Run the 2-device skew test on the copy sheet (it writes and then reverts test ticks)?

## 12. Locks (Steve t55u)
| Q | Lock |
|---|---|
| Q-CRDT-1 | Ship the **v0.36.1 clock guard first** ("Y"). |
| Q-CRDT-2 | Tick conflicts: **Set wins** (Developer option can change). |
| Q-CRDT-3 | Left: **sheet wins**; device vs device → **later receipt (recvAt) wins**. |
| Q-CRDT-4 | Clash review **in the app**: Sync › Review (new UI → mock crdt-mj1-review, needs its own lock). |
| Q-CRDT-5 | Compaction after 60 days over the **whole sheet history** (ticks, topics, dates, Left, subjects) — but **never** the current SoW and the immediately previous SoW (§13). |
| Q-CRDT-6 | Old app versions get **"Update the app"** (bridge refuses legacy `push` after migration). |
| Q-CRDT-7 | One-click **SoW › Migrate to op log**, automatic Drive backup first. |
| Q-CRDT-8 | **All data** on the op log: ticks, topics, session dates, Left, subjects ("Ticks are closely tied to topics and dates"). |
| Q-CRDT-9 | Copy-sheet two-device skew e2e **approved** (writes test ticks, then reverts). |

Changes vs §2–§10 from the locks:
- Op kinds: `tick.set`, `session.topic`, `session.date` (move a session to another date = ops on the session; its ticks follow by sessionId), `session.add`/`session.remove`, `left.set`, `subject.add`/`subject.active`.
- §8 legacy adapter is dropped: after migration `push` answers `{ok:false, error:'update the app'}`; `pull` stays for reading. Before migration nothing changes.
- Left between two devices: later `recvAt` (server clock) wins, not lamport.

## 13. "Current SoW" and "previous SoW" (never compacted)
A SoW (Setting of Work) period = one **topic run** of a subject: consecutive Sessions rows of the same `subjectKey` sharing the same `topic`, in date order (e.g. "Nouns — common & proper · 28/10 · 2/11" = one SoW with two dates).
1. Read Sessions (`subjectKey, date, topic`). Dates without a year are resolved with the academic-year start month (`sync.yearStartMonth`, `src/sync/academicYear.ts`), exactly like pulls.
2. Per `subjectKey`, sort by date; split into runs whenever `topic` changes.
3. **Current SoW** = the run containing the latest session date ≤ today (server date, Asia/Calcutta); if all dates are in the future, the earliest run.
4. **Previous SoW** = the run immediately before it — also across the academic-year boundary (so the first SoW of a new year still protects the last one of the old year).
5. Protected = every op whose target belongs to those runs' sessions (their ticks, topics, dates), plus the latest op of every Left/subject target. Everything else older than 60 days is folded into `Base` (state is kept; only the per-op history goes). A Drive backup of `Ops` is written before each compaction.
