# Redactions
Real pupil name tokens (from live Roster) replaced with [NAME] in kit text files:

- ./CHANGELOG.md: 6
- ./docs/KEYBOARD_WIDESCREEN_PLAN.md: 3
- ./docs/JOB_BUNDLES.md: 3
- ./docs/SHEET_MAPPING.md: 3
- ./prev-kit/05_SYNC_SHEET_MAPPING.md: 3
- ./mockups/v042-safety/mock.cjs: 1
- ./mockups/v042-safety/autosave.cjs: 1
- ./mockups/v041-header/mock-v4.cjs: 1
- ./mockups/v041-header/mock-v3.cjs: 1
- ./mockups/v041-header/mock-v2.cjs: 2

Mock scripts: demo name "Aarav Demo" collided with a real first-name token and was restored (it is demo data).
Removed images: mockups/v041-header v1 renders (day-*/night-* without v2 prefix, 9 PNGs) showed real roster names.

Not redacted: repo/sow-all.bundle (git history of the already-public repo; HEAD files CHANGELOG, docs/JOB_BUNDLES, KEYBOARD_WIDESCREEN_PLAN, SHEET_MAPPING, src/checklist/demoRoster.ts, src/demo/workspaceData.ts and several tests contain name tokens). The Google Sheets themselves hold real names.
