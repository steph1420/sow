# Setting of Work (SoW)

KGA/KGB Eng CW/HW marking PWA — **Lucid Quiet whole-app rewrite** (v0.24.0).

**Live:** https://steph1420.github.io/sow/

## Local

```bash
npm install
npm run dev    # http://localhost:5173/sow/ (or 5174 if set)
npm test
npm run build  # base /sow/ → dist for Pages
```

## Rollback

```bash
git fetch --tags
git checkout v0.21.0-pre-rewrite   # or v0.21.0
```

## Docs

- `docs/SHEET_MAPPING.md` · `docs/SYNC_SETUP.md` · `apps-script/SoWSync.gs`
- Rewrite canon (local): `/workspace/sow-mockups/WHOLE_APP_REWRITE.md`
