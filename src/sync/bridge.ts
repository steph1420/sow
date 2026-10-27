/** Talk to the optional Apps Script web app (execute as owner, anyone with link). */

export type BridgeResult = {
  ok: boolean
  message?: string
  sessions?: string[][]
  marks?: string[][]
  rosterMeta?: string[][]
}

export async function bridgeCall(
  syncUrl: string,
  body: Record<string, unknown>,
): Promise<BridgeResult> {
  const res = await fetch(syncUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight on GAS
    body: JSON.stringify(body),
  })
  const text = await res.text()
  try {
    return JSON.parse(text) as BridgeResult
  } catch {
    throw new Error(`Sync bridge returned non-JSON (${res.status})`)
  }
}

export async function bridgeEnsureAndPull(syncUrl: string, sheetId: string): Promise<BridgeResult> {
  return bridgeCall(syncUrl, { action: 'ensureAndPull', sheetId })
}

export async function bridgePush(
  syncUrl: string,
  sheetId: string,
  payload: { sessions: string[][]; marks: string[][]; rosterMeta: string[][] },
): Promise<BridgeResult> {
  return bridgeCall(syncUrl, { action: 'push', sheetId, ...payload })
}
