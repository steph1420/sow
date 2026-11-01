# Rules (non-negotiable; newer Steve turns override older docs)

1. **Mock before plug.** Visual change → mocks at **412×915 and 1440×900**, **Night first, then Day**, **demo names only** (Aarav Demo, Bela Sample, Chirag Test…), each labelled **MOCK**. Options with ONE recommendation. Keep the generator script next to the PNGs. Plain bug fixes may go straight to code.
2. **Only Steve locks.** LOCKED / PROPOSED / OPEN with Q-IDs; record his quote + date + turn id. "All good / Looks perfect / Lock" = lock; silence is not.
3. **Failing test first.** Triangulate in `docs/CODE_TRIANGULATION_vX.md`, write the failing unit/e2e test, then code. Gestures → real-touch Playwright (CDP).
4. **Back up before changes:** `git branch backup/pre-vX.Y.Z` + `tar czf /workspace/backup-sow-pre-vX.Y.Z.tgz --exclude=node_modules --exclude=dist sow-pwa`.
5. **SemVer + CHANGELOG + BUGS + tags** every release; entry names rollback tag/commit, Code.js change yes/no, Steve turn ids.
6. **Never force-push**, never rewrite pushed tags.
7. **Push when dogfood-ready** without asking. **Tell Steve only when live:** Actions green AND live bundle hash changed. Then dogfood live (phone + desktop, Night + Day).
8. **No invented data.** Classes only from real sheet tabs. No Math/Sci.
9. **Sheets:** LIVE = **"Notebook Status SOW"** `1vGXltIwxto-KGZr1ygSDk9EEM0m5rkLySXshZMdv4UQ`. NOT "Notebook Status", NOT "Notebook Satus 2". Read-only; back up first; never Migrate/Compact/destructive tests; revert any test write. TEST copy **"Notebook Status SOW - TEST copy"** `1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI`: all sync/CRDT tests (needs its own bridge).
10. **Secrets:** never print/commit `SOW_BRIDGE_TOKEN`; only the /exec URL is built in (`src/sync/defaultBridge.ts`).
11. **Real pupil names stay on the box.** Check every image before sending.
12. **Progress watchdog every 5 min during builds**: one short line each. Never silent long "checking"; stuck >10 min → say so, change approach.
13. Tweaks/physics behind Settings › Developer with sane defaults.
14. Root-cause every bug; one-line root cause.
15. Channel (t110u/t112u): v0.41.0 = **Stable**; new work ships as **Beta** via the Stable/Beta switch.
