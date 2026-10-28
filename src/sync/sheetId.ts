/** Extract spreadsheet id from a Google Sheets URL or bare id. */
export function extractSheetId(urlOrId: string): string | null {
  const s = urlOrId.trim()
  if (!s) return null
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (m) return m[1] ?? null
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s
  return null
}
