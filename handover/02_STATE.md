# STATE at handover (2026-11-01 12:10 IST)
LIVE: v0.45.0, commit 2282bdc, tag v0.45.0, bundle index-tFWxJPmk.js. Rollback: v0.44.5 / 6ea96a1 (branch backup/pre-v0.45.0).
Release history today: v0.44.1 2a750a4 (resurrection-on-sync fix, dial fixes, Cancel) · v0.44.2 270b529 (delete/move = one undo step) · v0.44.3 36b2427 + v0.44.4 0d804ca (duplicating header-date columns; 2-date mode fill/swap; healPair) · v0.44.5 6ea96a1 (option A selected-date style, probes fixed, amber header tint, masked URLs) · v0.45.0 2282bdc (auto-save, autosave icon, snapshots, restore).
Stack: React 19 + Vite + TS PWA, IndexedDB. Tests: Vitest (337 pass) + Playwright real-touch probes tests/e2e/*.cjs (412x915).
Sync: Apps Script bridge Code.js v0.44.0 (pull/push/prefs/pair/renameSession/deleteSession, tombstones in SOW_TOMBS script property, newer timestamp wins). Source: apps-script/Code.js in repo.
Sheets: LIVE "Notebook Status SOW" 1vGXltIwxto-KGZr1ygSDk9EEM0m5rkLySXshZMdv4UQ = READ-ONLY, never touch destructively; still on OLD bridge (Steve deploys v0.44 Code.js when happy with Beta). TEST copy 1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI = all sync tests; baseline 7 sessions / 311 tick rows / 216 ticked / 89 roster / 4 subjects — restore after every test.
Stable/Beta data switch: Beta = TEST /exec URL + token entered per device (never built in). Tokens: ask Steve via a secret request; store only as env (SOW_TEST_BRIDGE_TOKEN / SOW_BRIDGE_TOKEN); never print/commit.
Locked UX: see 03_NEXT.md "Locked".
