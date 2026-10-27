# SoW PWA — Redesign job bundles (from v0.7.1)

Steve locked-in build phase **2026-10-27**. Kiwi = builds · School Bot = sheets only if needed · Steve = locks / go.

**Rules**
- Backup before each bundle.
- No push without Steve OK.
- No `JB-R(n+1)` without explicit go.
- One go at a time.
- Ask-before-push.

**SemVer:** docs-only (JB-R1) → `docs:` commit, **no version bump**. App chrome starts bumping from JB-R2 (e.g. 0.8.0 when shell lands — Steve’s call at push time).

Path: `/workspace/sow-pwa` app · `/workspace/sow-pwa-docs` specs · mocks `/workspace/sow-mockups/out/full-*.png` + `p3-*.png` (see `LOCKED_UI.md`).

---

| ID | Name | Scope | Done when |
|----|------|-------|-----------|
| **JB-R1** | Docs lock | `SETTINGS_STG.md` + this file + `LOCKED_UI.md` + pointer in `JOB_BUNDLES.md` | Specs match Steve locks 2026-10-27 · **done** |
| **JB-R2** | Shell IA | 3 tabs Checklist · Overview · More (popup → Roster / History / Settings); rename Mark → Checklist routes | Nav matches mocks (`full-more-popup`, tab bar on full phones) · **done** (v0.8.0) |
| **JB-R3** | Overview | Flat session cards + expand; soft-shade `{classes}|{dates}` row; topic trunc when long; ring %; Open Checklist + Share | Matches `full-overview-*` · **done** (v0.9.0) |
| **JB-R4** | Checklist chrome | Count under class; cal under date; Topic trunc → toast + pencil → edit + X; undo/redo icons (per-class stacks); Set\|Submitted always on; search icon; Myntra Sort\|Filters; list clears FAB; thin A–Z | Matches `full-checklist-*` + `p3-topic-*` · **done** (v0.10.0) |
| **JB-R5** | Calendar | Cancel + Confirm from Checklist date ▾ / cal icon; no “Use xyz” | Matches `full-calendar` / `full-date-open-cal` · **done** (v0.11.0) |
| **JB-R6** | Settings + Dev | Appearance Night bold / Day bold + HC; Overview filter A/B/C; undo Icons \| Icons+label; A–Z physics prefs; `sow.prefs.v1` export; Sheet URL | Dev prefs work + export · **done** (v0.12.0) |
| **JB-R7** | Roster + History | Match full mocks | Lists usable (`full-roster`, `full-history`) · **done** (v0.13.0) |
| **JB-R8** | WA share | Locked template variables | Share matches approved template · **done** (v0.14.0) |
| **JB-R9** | Themes + deploy | Wire Day / bold / HC; Pages deploy | Themes wired · **done** (v0.15.0) — Pages push separate |

---

### Notes
- Soft shade (B) is the **default** Overview filter selected style; A Underline + C Bold+color live in Dev (build-time prefs — no separate Dev mock pass).
- Undo/Redo default = **icons only**; Icons+label in Dev. Stacks are **per class**.
- Status strip omitted — set count lives under class selector.
- A–Z on Checklist = thin idle; physics knobs (`az.*`) via Dev (Steve tests/export later).
- Original JB-1–7 are done; see `JOB_BUNDLES.md` pointer.
