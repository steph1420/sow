/** Optional Apps Script web app for push / ensure SoW_* tabs. */

export type BridgeResult = {
  ok: boolean
  message?: string
}

export async function bridgePush(
  syncUrl: string,
  sheetId: string,
  payload: { note: string },
): Promise<BridgeResult> {
  const res = await fetch(syncUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'push', sheetId, ...payload }),
  })
  const text = await res.text()
  try {
    return JSON.parse(text) as BridgeResult
  } catch {
    throw new Error(`Sync bridge returned non-JSON (${res.status})`)
  }
}
