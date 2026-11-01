/** v0.46.0: Settings › Sync "Check connection" — which sheet (TEST / LIVE by id) and which bridge version this phone talks to. */
import { bridgeCall } from './bridge'
import { extractSheetId } from './sheetId'
import { LIVE_SHEET_ID, TEST_SHEET_ID, TEST_EXEC_URL } from './sheets'
export { LIVE_SHEET_ID, TEST_SHEET_ID, TEST_EXEC_URL }

export function sheetLabel(id: string | null | undefined): string {
  if (!id) return 'Unknown sheet'
  if (id === TEST_SHEET_ID) return 'TEST copy'
  if (id === LIVE_SHEET_ID) return 'LIVE'
  return 'Other sheet'
}

export type Connection = { label: string; version: string; source: 'bridge' | 'settings'; note: string }
export function describeConnection(ping: { version?: string; sheetId?: string }, sheetUrl: string): Connection {
  const version = ping.version ?? 'unknown'
  if (ping.sheetId) return { label: sheetLabel(ping.sheetId), version, source: 'bridge', note: '' }
  return { label: sheetLabel(extractSheetId(sheetUrl)), version, source: 'settings', note: 'Sheet taken from Settings — update the bridge Code.js to 0.46 so it reports its own sheet.' }
}

export async function checkConnection(url: string, token: string, sheetUrl: string): Promise<Connection> {
  const r = await bridgeCall<{ version?: string; sheetId?: string }>(url, { action: 'ping', token })
  return describeConnection(r, sheetUrl)
}
