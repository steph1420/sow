# SoW PWA — agent notes

- Handover canon: `/workspace/lfps/sow-handover` (00_START_HERE → 11).
- Backup tgz before changes; triangulation doc + failing tests first; SemVer + CHANGELOG + BUGS + tag every release.
- **Push rule (Steve t128u/t153u, supersedes the old "no push without Steve OK"):** push to `master` (Pages) when dogfood-ready, never force-push, never rewrite tags; tell Steve only once the Actions run is green and the live bundle hash equals `dist`.
- Prefs live in localStorage `sow-app.prefs.v1` (`sow.prefs.v1` is the legacy v0.21 key, migrated once). IndexedDB is `sow-app`.
- Repo: `steph1420/sow`, branch `master`, local clone `/workspace/sow-pwa`.
