# Keyboard + widescreen — plan (PLAN + MOCKS, nothing built)

Request: Steve t62u "keyboard compatible in every aspect, including alpha strip (just quick jump to letter)… desktop widescreen adaptability (the same UI just scaled to viewport)". Correction (relayed): **`/` focuses the A–Z strip; while it is focused a typed letter jumps there; letters do nothing globally; Esc leaves the strip.**
Mocks: `sow-mockups/kbd-mj1-a-focus-{night,day}.png`, `kbd-mj1-b-shortcuts-{night,day}.png`, `wide-mj1-{night,day}.png` (generator `/workspace/kbd-mock/gen.cjs`, real v0.36.1 build + overlay, demo names). Base: v0.36.1. Status: **awaiting lock** (§7).

## 1. Audit (v0.36.1)
Legend: ✓ ok · ~ partial · ✗ missing.

| Area | Element (code) | Focusable | Visible focus | Enter/Space | Esc | Trap / return | Notes |
|---|---|---|---|---|---|---|---|
| Global | `:focus{outline:none}`, `:focus-visible` 1px rgba(255,255,255,.22) (`styles/tokens.css:88-95`) | — | ✗ | — | — | — | ring ≈1.3:1 on Night, invisible on Day (white) → fails WCAG 2.4.7 / 2.4.11 / 1.4.11 |
| Tab bar | Overview / Checklist / More (`shell/AppShell.tsx:246-280`) | ✓ buttons | ✗ ring | ✓ | — | — | no `aria-current` |
| More popover | `.more-pop role=dialog` (`AppShell.tsx:229-240`) | ✓ items | ✗ | ✓ | ✗ | ✗ no focus move/trap/return | |
| Checklist rows | `.sw-row`, `.sw-roll`, `.sw-name` (`checklist/ChecklistPage.tsx:575-600`) | ✗ divs, pointer only | ✗ | ✗ | — | — | **ticking is impossible by keyboard** |
| Tick cells | `.sw-check-hit` (`ChecklistPage.tsx:603-618`) | ✗ div, pointer only | ✗ | ✗ | — | — | no role/aria-checked |
| Tick-all | colhead `role=checkbox aria-checked` (`:549-551`) | ✓ | ✗ | ✓ | — | — | good pattern to copy |
| Date pills / Undo / Redo / Search / Tools | buttons (`:488-519`) | ✓ | ✗ | ✓ | — | — | |
| Swipe gestures | row paint, name swipe, roll drag-select, long-press (`gestures/*`) | ✗ | — | ✗ | — | — | no keyboard equivalent |
| A–Z strip | `.sw-az` pointer scrub (`checklist/az/AzStrip.tsx:80-110`) | ✗ | ✗ | ✗ | — | — | letters are divs |
| Tools sheet / Copy sheet | `role=dialog` (`:654`, `:715`) | ~ | ✗ | ✓ | ✓ (window key handler `:434-443`) | ✗ no focus move / trap / return; no `aria-modal` | |
| Select mode bar | `chrome/SelectBar.tsx` | ✓ | ✗ | ✓ | ✓ exits (`:437`) | — | |
| Search | `chrome/SearchBar.tsx` input | ✓ | ✗ | ✓ | ✗ (Close chip only) | — | |
| Overview | session cards, filters (`overview/*`) | ✓ buttons | ✗ | ✓ | — | — | accordion OK |
| Share sheet | `share/ShareSheet.tsx:133` dialog, drag handle `:143` pointer | ~ | ✗ | ✓ | ✗ | ✗ | drag-to-dismiss only by pointer |
| Settings / Sync / Dev | `.more-row` buttons, `.toggle` spans | ✓ | ✗ | ✓ | — | — | toggles lack `role=switch`/`aria-checked` (except PrefsSyncCard) |
| Hidden `<select>` overlays | Dev pickers (`more/DevPage.tsx`) | ✓ | ✗ (opacity 0) | ✓ native | — | — | focus not shown on the row |
| Colour theme list | `role=radio` buttons (`more/AppearancePage.tsx`) | ✓ each | ✗ | ✓ | — | — | APG radiogroup wants roving tabindex + arrows |
| Sharing templates | reorder handle pointer (`more/SharingPage.tsx:233`) | ✗ | ✗ | ✗ | — | — | name input Enter commits ✓ |
| Bottom sheets `sp-sheet` (Import, Install, Which settings) | `aria-modal` ✓ | ✓ buttons | ✗ | ✓ | ✗ | ✗ trap/return | scrim click only |
| Join digits | 6 inputs, Backspace moves back (`SetupDevices.tsx:171`) | ✓ | ✗ | ✓ | — | — | arrows don't move |
| Back | `.more-back` buttons, Android back (`nav/backStack.ts`) | ✓ | ✗ | ✓ | ✗ | — | Esc not wired |
| Tab order | DOM order; A–Z after rows; tab bar last | ~ | | | | | no skip link |

## 2. Keyboard map (proposed)
Rule: shortcuts are **off while focus is in a text field / select** (`input, textarea, select, [contenteditable]`), except Esc. Letters are **never** global (WCAG 2.1.4 character key shortcuts satisfied).

**Checklist grid** — APG *Grid* pattern: one tab stop (roving tabindex) on the current cell; rows `role=row`, cells `role=gridcell` with a `role=checkbox aria-checked` inside.
| Keys | Action |
|---|---|
| ↑ ↓ / Home End / PgUp PgDn | move pupil (scrolls into view) |
| ← → | move between date columns (and name) |
| Space or Enter | toggle Set (Submitted in Submitted mode) |
| Shift+Space | set/unset both visible dates on the row (= row swipe) |
| Shift+↑↓ | extend selection (= long-press + roll drag), then Select bar acts |
| Ctrl/⌘+Z, Ctrl+Y / ⌘+Shift+Z | undo / redo |
| Ctrl/⌘+F | open the pupil search (app search, not browser find) |
| `/` | **focus the A–Z strip** |
| Esc | leave strip / close sheet / exit select / back |
| ? | shortcuts sheet |

**A–Z strip** (focused by `/` or Tab): `role=listbox`-like toolbar, `aria-label="Jump to letter"`.
- Typed letter → focus point = that letter; checklist scrolls to and focuses the first pupil with it; same letter again → next pupil with it (cycles). Dimmed letter → nearest following present letter + "No pupils with Q" announced.
- ↑ ↓ move along letters; Enter = go to the pupil and put focus in the grid; Esc = leave strip, focus back on the grid cell it came from.
- A live region announces "D · Diya Example · 1 of 3".

**Everywhere:** Alt+1/2/3 = Overview / Checklist / More (Alt avoids letter conflicts); Esc = back / close; ? = shortcuts. Sheets/dialogs: focus moves into the sheet, Tab is trapped, Esc closes, focus returns to the opener (APG *Dialog (modal)*). Toggles become `role=switch aria-checked`. Colour theme list: roving radiogroup with arrows. Sharing reorder: handle button + Alt+↑↓ to move. Join digits: ← → move.
**Left** has no app UI today (setLeft unused, `data/api.ts`) — no key until a Left action exists (Q-KBD-4).
**Focus ring:** 3px `var(--accent)` outline + 2px offset (≥3:1 on both themes, every colour theme; `--accent` already AA-checked), shown only for keyboard (`:focus-visible`).

## 3. Widescreen
Today: `.app-shell { max-width: 560px }` (`styles/shell.css:6`) → a small unscaled column on desktop.
- **(i) Recommended: centered phone column scaled to the viewport.** Layout stays exactly 412 CSS px wide logically; scale `s = clamp(1, viewportHeight / 915, 1.6)` and also `≤ viewportWidth / 412`. Implementation: CSS `zoom: s` on `#root` (Chrome/Edge/Safari support `zoom`; Firefox ≥126 supports it) with a `transform: scale` fallback. Side areas = page background. Touch targets scale too.
  - 1920×1080 (16:9): s = 1080/915 = **1.18** → column ≈ 486 px wide, full height (mock `wide-mj1`).
  - 2560×1080 (21:9): same height → **1.18**, column centered with wide margins (same picture, more background).
  - 2560×1440: 1.57. 3840×2160: capped 1.6.
- (ii) CSS clamp of type/spacing by viewport: re-flows rows and widths → not "the same UI", more regressions (A–Z geometry, swipe physics, 44 px floors). Not recommended.
- Fixed-position sheets and the tab bar scale with the column (they live inside `#root`).
- Keyboard + wide go together (desktop users have keyboards).

## 4. Release size and phasing
- **SHIPPED as one release, v0.37.0** (Steve t64u "go all the way till push", t65u thorough, t66u dogfood). CRDT op log moves to v0.38.0. Original split kept below for reference.
- ~~v0.38.0 Keyboard core~~ (~450–600 lines): focus ring tokens, grid roving tabindex + Space/Enter/Shift+Space/arrows, `/` A–Z strip mode, Esc chain, dialog focus trap/return helper (one hook for all sheets), `role=switch` toggles, ? sheet. Mock lock first.
- **v0.38.1 Keyboard rest** (~200 lines): selection with Shift+arrows, Sharing reorder keys, radiogroup arrows, Join arrows, Alt+1/2/3, skip link.
- **v0.38.2 Widescreen** (~80 lines): zoom wrapper + matchMedia resize, wide probe. Could ship first (small, independent).

## 5. Test plan (failing tests first)
- Unit: `azKeyJump(letter, roster, current)` cycling + dimmed letters; shortcut guard (no shortcut inside inputs); scale function for 1920×1080, 2560×1080, 412×915 (=1).
- Playwright keyboard-only e2e (`tests/e2e/keyboard-probe.cjs`, no mouse/touch): Tab from load reaches every control in a sensible order; tick 3 pupils with arrows + Space; `/` then `D` lands on first D, `D` again on the next, Esc returns to the grid; every sheet traps focus and Esc closes + returns focus; ? opens the list; Alt+1/2/3 switch tabs; Night + Day, 412×915 and 1920×1080.
- Focus visibility probe: screenshot focused element, measure ring contrast ≥3:1 vs adjacent (WCAG 2.4.11/1.4.11) for all 9 colour themes.
- axe-core (`@axe-core/playwright`) on every screen, Night + Day: 0 serious/critical.
- Existing 26 probes stay green (touch behaviour unchanged).

## 6. Not changing
Touch gestures, physics, 44 px floors, A–Z idle width 42 — unchanged; keyboard adds paths, never removes.

## 7. Open questions (recommendations in bold)
1. **Q-KBD-1** `/` focuses the A–Z strip (locked by Steve). Search moves to **Ctrl/⌘+F** — OK? (alternative: Tab to the search button only)
2. **Q-KBD-2** In the strip, a dimmed letter (no pupils) → **jump to the next letter that has pupils** and say so — or do nothing?
3. **Q-KBD-3** Space/Enter toggles **Set in Set mode, Submitted in Submitted mode** (follows the mode bar) — OK?
4. **Q-KBD-4** Left has no button in the app yet → **no key now**; add when a Left action is mocked?
5. **Q-KBD-5** Tab switching on **Alt+1/2/3** (no plain letters anywhere) — OK?
6. **Q-KBD-6** Focus ring: **3 px theme-accent ring** as mocked — OK?
7. **Q-WIDE-1** **Option (i)**: centered phone column scaled to the screen height (1.18× on 1920×1080 and 2560×1080), max **1.6×** — OK?
8. **Q-WIDE-2** Side areas: **plain page background** (mock) or a subtle phone frame?
9. **Q-WIDE-3** Ship widescreen first (small, ~80 lines) **yes**, then keyboard?


## Dogfood log (t66u) — `tests/e2e/kbd-dogfood.cjs`, desktop 1920×1080 and phone 412×915 with a keyboard

| Task | Keys | Time (script) | Slowest key |
|---|---|---|---|
| Mark a whole class (42 pupils, 18 already ticked) | 55 (Tab×~13 to reach grid, then 1 key per pupil) | 1.9 s | 73 ms |
| Undo the class | 42 | 1.4 s | 33 ms |
| `/` + S + S + Enter + Space (jump, cycle, tick) | 5 | 0.17 s | 33 ms |
| Mark a pupil Left + undo (L, Ctrl+Z) | 3 | 0.1 s | 31 ms |
| Switch tabs + switch class (Ctrl+1/2, [ ], Ctrl+1 ↓ Enter Tab Enter) | 9 (was 38 and failed) | 0.5 s | 33 ms |
| Ctrl+, → Appearance → change theme | 16 (1 with Ctrl+Shift+L) | 0.56 s | 60 ms |
| Sync now (Ctrl+S) | 1 | 0.35 s | 51 ms |

Friction found → change:
1. **Space only ticked, focus stayed** → a class took 2 keys per pupil (Space, ↓). Added auto-advance after a keyboard tick (on by default; Developer option "Keyboard tick moves to next pupil", synced with Developer options). Now 1 key per pupil.
2. **Toggle unticked already-ticked pupils** when hammering Space → realistic flow is Space for "has it", ↓ to skip; with auto-advance both are 1 key.
3. **Focus fell to `<body>` after every screen change** (Ctrl+1/2, [ ], Ctrl+, Ctrl+S, Enter on a Settings row) → AppShell now lands focus: Checklist → current grid cell, Overview → first/expanded class card, More → first item, sub-pages → first control. Pointer users unaffected.
4. **No fast way between classes** (8+ Tabs through filter chips) → Overview cards take ↑/↓; Ctrl+1 lands on the first card.
5. **"Mark Left" had no UI at all** (Left was display-only) → `L` in the grid marks Left (writes rosterMeta → pushed on Sync, same as the sheet's Left), focus stays on the row that slid up; Ctrl+Z restores Active.
6. Invisible focus: none after fixes (ring checked after every key: ≥2 px accent outline + halo, on-screen). No key took >100 ms on desktop; one 162 ms on phone width before the focus fix, none after.
