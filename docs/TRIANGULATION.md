# Triangulation — pretty remocks × portal IA × Wave A × field teacher

**For:** Steve · coding agents · **Date:** 2026-10-28 (Asia/Calcutta)  
**Trigger:** Steve t143u — triangulate every feature/action; think what a human would like to see and how they interact.  
**Status:** **LOCKED + PLUGGED v0.24.0** (Steve t144u). Live Pages → **v0.24.0**.  
**Inputs:** `PRETTY_SETTINGS_PLAN.md` · `PORTAL_IA_PLAN.md` (locked/plugged) · `CLEANER_UI_PLAN.md` (locked) · live sow-app / sow-pwa mental model · revised `out/pretty-mj1…mj4.png`  
**Gate:** Locked t144u · plugged into sow-pwa v0.24.0 · coding notes `CODE_TRIANGULATION_v024.md`.

---

## 0. What we made (one sentence)

A **Quiet Lucid field phone** where **Overview is home** (pick class/session), **Checklist is the mark surface** (lean echo + Wave A gestures), **More is a popup** (Roster · History · Settings), and Settings/Sync get ColorOS-soft craft — not Eng-only, not a brutal text stabber.

---

## 1. Teacher journey (field, one-handed, under time)

For each step: **affordance · tap does · goes to · expects · gaps**.

### 1.1 Open app
| | |
|--|--|
| **Affordance** | PWA cold start → Overview (portal default) |
| **Does** | Lands on Classes list + filters |
| **Expects** | “What do I mark next?” at a glance |
| **Gaps** | Live v0.23 still **promotes** expanded card to “Now marking” hero — pretty remock **accordion in situ** (Steve t142). Plug must kill promote. |

### 1.2 Pick class / subject / date
| | |
|--|--|
| **Affordance** | Filter chips: class (All·KGA·KGB) · subject (Eng·Math) · date (All·Wed 28…) · card tap expands |
| **Does** | Filters list; tap card → expand in place (one open); Open Checklist sets active class + jumps Checklist |
| **Expects** | Stable list order; mid-list Math card doesn’t jump to top; subject tags readable |
| **Gaps** | Live data/model is **Eng-only** (`KGA_Eng_*`). Pretty shows Math/Sci — plug needs multi-subject sessions + filters. CW/HW not a third chip row (tags on cards instead) — OK if tags stay. Filter row can feel wide (All×2) — acceptable; don’t add CW/HW chips unless Steve asks. |

### 1.3 Enter Checklist (mark)
| | |
|--|--|
| **Affordance** | **Open Checklist** (only primary CTA on expanded card) · or Checklist tab (last active class) |
| **Does** | Lean panel: class · topic · set-count; tools row: date pills · undo/redo · Tools ▾ · search; roster + ✓ |
| **Expects** | Roster is the hero; chrome doesn’t re-pack date cards |
| **Gaps** | Checklist tab with no prior pick → last `activeClassKey` (silent). Soft: OK for dogfood; later empty-state “Pick a class on Overview” if none. Class tap on lean panel → Overview (agency) — KEEP. |

### 1.4 Mark / undo / paint / select / A–Z
| | |
|--|--|
| **Affordance** | Tap ✓ · hold-drag paint · hold name → select · A–Z strip · pills force ≥1 date · Tools = Set/Submitted · Pending · Copy |
| **Does** | Wave A physics (locked); soft-green stroke, no blue rings; tick C; FAB off |
| **Expects** | Fast, inevitable hand feel; undo nearby |
| **Gaps** | None vs locks. Tools sheet vs old modebar — already locked portal. **KEEP.** |

### 1.5 Sync
| | |
|--|--|
| **Affordance** | More → Settings → Sync · or Settings hero **Sync** tile · primary **Sync now** |
| **Does (proposed)** | Sync now = pull **selected** subject tabs + push if Apps Script URL set & dirty; else Quiet “saved on device”. Ghosts: Test sheet · Pull only |
| **Expects** | One obvious button; not “which of three rows?” |
| **Gaps** | Live = Test / Pull Eng tabs / Push local as equal rows + Eng-only copy. Plug must implement smart Sync now + multi-subject pull. Chips on Sync = **this-run selection**; catalog lives in **Subjects & sheets**. |

### 1.6 Settings / look & feel
| | |
|--|--|
| **Affordance** | More popup → Settings; Appearance Night/Day phones; FAB · A–Z · Reduce motion |
| **Does** | Theme + progressive Checklist prefs; Dev under System |
| **Expects** | Pretty cards, not text stabber; not Eng-only language |
| **Gaps** | Live Settings is thin/brutal. Pretty home dual-lists Roster/History (also in More) — **KEEP** (ColorOS dual entry). Soft-green / Marking-defaults duplicates removed in triang revise. |

---

## 2. Contradiction matrix (pretty × portal × locked gestures)

| Clash | Sources | Verdict |
|-------|---------|---------|
| Overview **expand-in-place** vs **Now-marking hero promote** | pretty-mj1 · portal-mj1 · live OverviewPage | **FIX before plug** — accordion wins (Steve t142). Portal IA home role stays; hero promotion dies. |
| Multi-subject remocks vs **Eng-only** workspace / `pullEng` / “Pull Eng tabs” | pretty-mj1/2/3 · live data + SyncPage | **FIX before plug** — data + Sync copy + filters. Remocks already show Eng·Math·Sci. |
| Sync **Sync now** vs equal Pull/Push/Test rows | pretty-mj2 · live SyncPage | **FIX before plug** — one primary; semantics: pull selected (+push if bridge). Ghosts: Test · Pull only. |
| Settings **Subjects & sheets** vs Sync **subject chips** | pretty-mj2/3 | **FIX (IA copy)** — Subjects owns catalog; Sync chips = this-run. Subtitle revised to “manage tabs”. |
| Settings **Roster/History** vs More popup same | pretty-mj3 · lucid-mj5 · AppShell | **KEEP** — More = fast path; Settings = full catalog. |
| **Marking defaults** row vs Appearance Checklist feel | pretty-mj3/4 | **FIX** — dropped Marking defaults from MJ3 (re-shot). |
| **Soft-green done** toggle vs locked tick-C accent | pretty-mj4 · CLEANER/DESIGN_PSYCH | **DROP** — removed from MJ4 (re-shot). Accent is craft, not a casual switch. |
| Expanded card **blue math ring** vs one-accent Lucid | pretty-mj1 · CLEANER accent policy | **FIX** — ring back to progress-tone green (re-shot). Selection = card soft-green glow. |
| **Share** next to Open Checklist (stub → “Share — Sync”) | pretty-mj1 · live SessionCard | **DROP from primary** for now (re-shot: Open Checklist only). Reintroduce when system share of set/submitted is real. |
| Decorative **Math sheet** status pill (no action) | pretty-mj1 | **DROP** (re-shot). |
| Lean Checklist vs fat Lucid Checklist chrome | portal-mj2 · lucid-mj1 | **KEEP portal lean** — lucid-mj1 is visual token memory, not IA. |
| More = **popup** vs Settings as full pages | lucid-mj5 · pretty settings | **KEEP both** — popup launches; Settings/Sync/Appearance are stacked pages. |
| Checklist tab without session | AppShell | **FIX later (soft)** — empty/last-used hint; not blocking plug. |
| Filter: subject chips vs missing CW/HW chips | pretty vs live CW filter | **KEEP** subject filters + CW/HW as tags on cards. Don’t stack three chip dimensions. |

---

## 3. Human-sense pass (glance · one hand · Quiet)

| Pressure moment | Feels right? | Note |
|-----------------|--------------|------|
| Glance Overview for next class | Yes (accordion + rings + tags) | Mid-list expand must not scroll-jump; animate height in place. |
| Thumb Open Checklist | Yes — single primary | Share gone from chrome = less mis-tap. |
| Marking 40 names fast | Yes — lean + Wave A | Don’t re-add date-card stack. |
| “Did my marks sync?” | Better with Sync now + micro | Teacher must never think marks vanished if push blank — lede + micro say offline-first. |
| Eng teacher who also has Math | Remock yes; live no | Blocking honesty gap — multi-subject is a **plug requirement**, not polish. |
| Opening More then Settings then Roster | Slightly long vs More→Roster | Dual entry OK; don’t remove Roster from More. |
| Appearance Soft-green toggle | Was confusing (“turn off the brand?”) | Dropped. |
| Busy filter strip | Mild | Two All chips read as class-All + date-All — fine once used once. |

---

## 4. Verdict board — KEEP / FIX before plug / DROP

### KEEP (locked or remock-true)
1. **Portal IA** — Overview home · lean Checklist · Tools sheet · tab order Overview · Checklist · More  
2. **More = popup** (Roster · History · Settings)  
3. **Wave A** — hold-paint · select · A–Z 42 · pills ≥1 · tick C · FAB off · soft-green done · no blue rings  
4. **Overview accordion** — expand in situ · one open · stable order (pretty-mj1)  
5. **Quiet Lucid tokens** — soft-outline · air · brightness hierarchy · ColorOS-soft Settings craft  
6. **Sync now as primary CTA** with offline-first honesty  
7. **Dual entry** Roster/History (More + Settings Classroom)  
8. **Subjects & sheets** destination (catalog) separate from Sync run chips  

### FIX before plug (prioritized)
1. **Kill Now-marking promote** — implement accordion list; `expandedId` expands in place; no `nowMarking`/`others` split  
2. **Multi-subject honesty** — sessions/filters/tags beyond Eng; Sync pull not `pullEng`-named in UI; “subject tabs” copy  
3. **Sync now semantics** — pull selected tabs; push iff bridge + dirty; ghosts Test · Pull only; drop equal-weight Push row from daily path  
4. **Subjects ownership** — Subjects & sheets manages tab list; Sync chips select this run (no “+ tab” inventing catalog on Sync forever — “+ tab” may deep-link Subjects)  
5. **Settings craft plug** — hero tiles · Appearance phones · remove brutal-only rows; no Soft-green toggle; no Marking-defaults duplicate  
6. **Share** — omit until real OS share of progress summary (or wire intentionally)  
7. **(Soft)** Checklist-with-no-session empty hint  

### DROP
1. Now-marking hero promotion  
2. Eng-only Sync / Settings copy leftovers  
3. Soft-green done as Appearance toggle  
4. Marking defaults Settings row (fold into Appearance)  
5. Share stub + decorative “Math sheet” pill on Overview card  
6. Blue “selected subject” progress ring  
7. Pages plug before Steve locks this triangulation  

---

## 5. Remock revisions this pass (re-shot)

| Crop | Change |
|------|--------|
| `pretty-mj1-overview-accordion.png` | Ring progress-tone (not blue) · Share removed · Math sheet pill removed · callout updated |
| `pretty-mj2-sync.png` | Sync now micro (“Pulls selected · pushes when bridge ready”) · ghost **Pull only** · callout updated |
| `pretty-mj3-settings-home.png` | Marking defaults row removed · Subjects sub “manage tabs” |
| `pretty-mj4-settings-theme.png` | Soft-green done toggle removed |

Source: `crops-pretty.html` · `shot-crops-pretty.mjs`. Portal/lucid PNGs untouched.

---

## 6. Plug checklist (after Steve lock only)

- [x] Overview accordion (no promote)  
- [x] Multi-subject demo sessions + Eng·Math filters + subject tags  
- [x] Sync page: Sync now · Test · Pull only · multi-subject copy · chips  
- [x] Settings home + Appearance craft (pretty-mj3/4)  
- [x] Subjects & sheets stub page (catalog) or honest “coming” that doesn’t lie  
- [x] Omit Share on Overview until real  
- [x] Bump beyond v0.23.0 · Pages only after Steve says plug  
- [x] Live stays **v0.23.0** until that moment  

---

## 7. Top 5 KEEP · Top 5 FIX (Steve glance)

**KEEP**
1. Portal Overview-home + lean Checklist  
2. More popup  
3. Wave A gestures + Quiet Lucid craft  
4. Accordion expand-in-place  
5. Sync now as the one Sync job  

**FIX before plug**
1. Replace Now-marking promote with accordion  
2. Multi-subject (data + Sync + filters) — Steve does not only work Eng  
3. Sync now semantics (+ Pull only / Test ghosts)  
4. Subjects catalog vs Sync chips ownership  
5. Settings pretty plug without Soft-green toggle / Marking-defaults duplicate / Share stub  

---

*End triangulation. Locked t144u · plugged v0.24.0.*
