import { putSettings } from './api'
import { getDb } from './db'

/**
 * First launch: mark seeded + default sheet URL only.
 * No demo roster / Left / session — Sync A pulls live Eng tabs.
 */
export async function seedIfEmpty(): Promise<{ seeded: boolean }> {
  const db = await getDb()
  const settings = await db.get('settings', 'app')
  if (settings?.seededAt) return { seeded: false }

  const ts = new Date().toISOString()
  await putSettings({
    hideLeft: false,
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1SdbZP8dHmNl2xhd9_srt6n-U2gqkQH8Aj7du5B5Mviw/edit',
    syncUrl: '',
    theme: 'night',
    seededAt: ts,
  })

  return { seeded: true }
}
