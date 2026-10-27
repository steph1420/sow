# SoW — Locked UI (collect pointer)

**Steve locked-in · build phase · 2026-10-27**

Mocks live under `/workspace/sow-mockups/`:
- Full phones: `out/full-*.png`
- Topic toast / edit / trunc + filter style crops: `out/p3-*.png` (also `p2-topic-edit`, `p2-undo-redo`)
- Index: `FULL_SET.md`

## What locked
- **Nav:** 3 tabs Checklist · Overview · More (3-dot popup → Roster, History, Settings — not a hub page). Mark renamed Checklist.
- **Overview:** flat cards (no drill-in); one-row sliding `{classes} | {dates}`; selected = soft shade (B); no Upcoming: / Next subtitle; ring %; middot line `Mon 10 · 15/44 · topic…`; truncate topic only when long; expand → Set/Submitted + Open Checklist + Share; full topic wraps own line (no invented “Topic” label in card values).
- **Checklist chrome:** set count under class; calendar icon under date; Topic same aesthetics (trunc when long → tap toast + pencil → edit + X); undo/redo icons under date / right of Topic (per-class stacks); Set|Submitted always on; search icon→expand; Myntra Sort|Filters + sheets; list clears FAB; thin A–Z idle.
- **Calendar:** Cancel + Confirm from Checklist date ▾ / cal icon; no “Use xyz”.
- **Appearance:** Night bold option; Day bold + high-contrast options (Settings / Dev).
- **Share:** WA template maker approved (• separators / variables as previously locked).
- **Dev prefs (build):** `overview.filterStyle`, `undo.chrome`, appearance bold/HC, existing `az.*` / `filter.*` / `date.*`. Specs in `SETTINGS_STG.md`.

Build continues via `JOB_BUNDLES_REDESIGN.md` (JB-R1 docs → JB-R2+ app).
