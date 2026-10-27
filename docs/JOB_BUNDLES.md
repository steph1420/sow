# SoW PWA — Job bundles (approve one at a time)

> **Redesign (2026-10-27):** Original JB-1–7 are **done**. Redesign continues in [`JOB_BUNDLES_REDESIGN.md`](./JOB_BUNDLES_REDESIGN.md) (JB-R1 docs → JB-R9). Specs: `SETTINGS_STG.md`, `LOCKED_UI.md`.

Aligned with School Bot 2026-10-27. Kiwi = build+SemVer · School Bot = sheet mapping/import · Steve locks/go.

Path: `/workspace/sow-pwa` until repo A (`steph1420/sow`) or B (box-only) locked. Backup before each. No push without OK. No JB-n+1 without explicit go.

---

## JB-1 · Scaffold — **Kiwi** *(start)*
Vite+React+TS PWA, router shell, Day/Night tokens, empty screen stubs.  
*Done:* app opens locally; routes stubbed. `v0.1.0`

## JB-2 · Local data — **Kiwi** (+ School Bot signs field names)
IndexedDB: classes, roster, sessions (≤2 dates), marks (`set`+`submitted`), Left; seed KGA/KGB + Ishita/Riyaarth/Rudransh Left.  
*Done:* CRUD works in tests/console.

## JB-3 · Mark core — **Kiwi** *(heaviest UI — keep as one careful slice)*
Date inputs, ✓ columns, Tools panel, filters, date→single col, header check-all (skip Left).  
*Done:* mark a fake session offline matching mocks.

## JB-4 · Shell screens — **Kiwi** *(done v0.4.0)*
Home, Session, Roster (Left only here), History, Settings (Hide left + Sheet URL, no live sync).  
*Done:* full nav matches chosen mocks. `v0.4.0`

## JB-5 · Sheet map (spec) — **School Bot**
Column contracts for class tabs + `SoW_Sessions` / `SoW_Marks` / `SoW_RosterMeta`; import rules.  
*Done:* written spec Steve approves.

## JB-6 · Sheet sync — **Kiwi** impl + **School Bot** mapping *(done v0.5.0)*
Pull roster by URL; read/write SoW tabs; offline queue.  
*Done:* pull against real sheet; round-trip via Apps Script bridge. `v0.5.0`

## JB-7 · Polish — **Kiwi** *(done v0.6.0)*
Day theme, PWA install, edge cases.  
*Done:* installable night+day; bugs logged. `v0.6.0`

---

### Size note
JB-3 is the biggest UI bundle; keep whole so Mark stays coherent. If it slips mid-build, split only then: **JB-3a** list+taps · **JB-3b** Tools/filters/check-all — Steve’s call at that moment.
