# Lessons (mistake → fix)

1. **Hesitant drag-down:** Chrome ~15 px touch slop → preventDefault on touchstart in sheet top 64 px (v0.40.0).
2. **Two taps to close Quick overview:** swipe-up became a fling swallowing the next tap → fixed, in BUGS.
3. **Desktop scale reference wrong twice:** /915 height (v0.37) then column-only scale (v0.40.1, 670 px strip on 1440×900 Brave) → v0.40.2 full width, height/600. Measure at Steve's real window on every route.
4. **Overstated progress** from changed files → report only tests run, Actions green, live hash.
5. **Mis-briefed "dates stay on the left"** → re-read the lock/screenshot before briefing workers.
6. **Real pupil names in mocks** (v041 v1/v2 from live roster) → demo-name injection; inspect each image. v1 images excluded from kit.
7. **Pushes "refused" 4:44–8:00 AM IST:** the safety-check classifier erroring, not git → retry same action with approval, never reshape.
8. Watchdog routines: create per build, delete after release.
