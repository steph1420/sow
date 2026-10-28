import { putSettings } from './api'
import { getDb } from './db'
import { loadWorkspaceFromIdb, seedDemoWorkspaceToIdb } from './persistWorkspace'

/**
 * First launch: settings + offline demo roster/marks into IDB.
 * Eng pull (when sheet reachable) can replace later via Sync.
 */
export async function seedIfEmpty(): Promise<{ seeded: boolean }> {
  const db = await getDb()
  const settings = await db.get('settings', 'app')
  const { hasStudents } = await loadWorkspaceFromIdb()

  if (settings?.seededAt && hasStudents) return { seeded: false }

  const ts = new Date().toISOString()
  if (!settings?.seededAt) {
    await putSettings({
      hideLeft: false,
      sheetUrl:
        'https://docs.google.com/spreadsheets/d/1SdbZP8dHmNl2xhd9_srt6n-U2gqkQH8Aj7du5B5Mviw/edit',
      syncUrl: '',
      theme: 'night',
      seededAt: ts,
    })
  }

  if (!hasStudents) {
    await seedDemoWorkspaceToIdb()
  }

  return { seeded: true }
}
