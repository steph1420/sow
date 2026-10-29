# Code triangulation — v0.31.0 (t4u, t5u), 2026-10-29 IST

## t4u "Stuck in 0.29.0"
- Root cause 1: `src/more/SettingsPage.tsx:123` `'v0.29.0 · Quiet Lucid'`, `src/more/AboutPage.tsx:16` `'0.29.0'` hardcoded. Live bundle was v0.30.0.
- Root cause 2: `vite.config.ts` had `registerType: 'autoUpdate'` but no registration code in src and no `clientsClaim`; the browser only re-checks `sw.js` on navigation, and an Android PWA resumed from background doesn't navigate.
- Fix: `src/lib/appVersion.ts` (`__APP_VERSION__` via Vite `define`), `src/pwa/updateFlow.ts` (update() on visible/focus; on controllerchange flush `sow:flush` then reload after pointer lifts; first claim on a fresh install ignored), manual registration in `main.tsx`, workbox `clientsClaim/skipWaiting/cleanupOutdatedCaches`.
- Tests first: `appVersion.test.ts`, `updateFlow.test.ts` (5), `sw-update-probe.cjs` (failed: no reload; then failed: first-install session never updated; both fixed). Build check `scripts/check-version.mjs`.
- Trap: a phone still on the v0.29/v0.30 SW runs the old JS (no focus check) until its next navigation/cold start; once on v0.31.0 every resume checks.

## t5u swipe from name
- Before: only `.sw-check-hit` cells started a paint (`onCheckPointerDown`); `.sw-name` only long-press (`onNamePointerDown`).
- Fix: `gestures/nameSwipe.ts` (`nameArmed`, `crossedColumns`); name pointerdown arms a paint with `fromName` when x ≥ frac·width; session starts only when a box column is crossed; commit writes crossed columns only; cue classes target `.tgt` checks only. Value = t165u row rule.
- Traps: no preventDefault (native pan-y scroll kept); long-press timer kept (cleared once the swipe engages); tap on name never toggles.
- Pref `gestures.nameSwipeFrom` (Dev option, default 0.5).
