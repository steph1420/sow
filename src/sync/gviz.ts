import { parseCsv } from './csv'

export async function fetchSheetCsv(sheetId: string, tabName: string): Promise<string[][]> {
  const u = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`)
  u.searchParams.set('tqx', 'out:csv')
  u.searchParams.set('sheet', tabName)
  const res = await fetch(u.toString())
  if (!res.ok) throw new Error(`Sheet fetch failed (${res.status}) for tab “${tabName}”`)
  const text = await res.text()
  // Missing tab often returns first sheet or an HTML error page
  if (text.trimStart().startsWith('<!') || text.includes('google.visualization.Query.setResponse')) {
    throw new Error(`Tab “${tabName}” not readable (missing or not shared)`)
  }
  return parseCsv(text)
}

export async function testSheetReadable(sheetId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const rows = await fetchSheetCsv(sheetId, 'KGA Eng CW')
    const hasRoll = rows.some((r) => /^\d+$/.test(String(r[0] ?? '').trim()) && String(r[1] ?? '').trim())
    if (!hasRoll) return { ok: false, message: 'Opened workbook but no roll/name rows on KGA Eng CW.' }
    return { ok: true, message: 'Workbook reachable (link view). Teaching tabs readable.' }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}
