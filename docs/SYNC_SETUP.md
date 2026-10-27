# SoW sheet sync setup (JB-6+)

## Preferred: Google Sheets connector (bot-side push)
Steve connects **Google Sheets** in chat with School Bot / Kiwi. Agents then:
1. Create `SoW_Sessions` / `SoW_Marks` / `SoW_RosterMeta` if missing (headers per `docs/SHEET_MAPPING.md`)
2. Pull/push those tabs via the connector — **never** write teaching-tab tick columns
3. PWA still **pulls roster** from the four Eng tabs (link-view / Sync in Settings)

Workbook id (locked example): `1SdbZP8dHmNl2xhd9_srt6n-U2gqkQH8Aj7du5B5Mviw`

## PWA Settings
1. Paste the workbook URL → **Test** / **Sync** for local roster pull + SoW_* merge when tabs exist.
2. **Sync Web App URL** (Apps Script) is optional fallback only — prefer the connector for create/push.

## Optional fallback: Apps Script
See `apps-script/SoWSync.gs` if you need device-side push without the bot. Deploy as Web app (Execute as Me, Anyone) and paste the URL into Settings.
