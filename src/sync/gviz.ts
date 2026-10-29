import { parseCsv } from './csv'
import { classKeyForTab, subjectOf, CLASS_LABELS, type DiscoveredTab } from '../data/types'

function gvizUrl(sheetId: string, tabName: string): string {
  const u = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`)
  u.searchParams.set('tqx', 'out:csv')
  u.searchParams.set('sheet', tabName)
  return u.toString()
}

/** P1-2: network-level failure (offline, DNS, CORS-less abort) — distinct from HTTP/tab errors. */
export class OfflineError extends Error {
  constructor(message = 'You’re offline') {
    super(message)
    this.name = 'OfflineError'
  }
}

export async function fetchSheetText(sheetId: string, tabName: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(gvizUrl(sheetId, tabName))
  } catch (e) {
    throw new OfflineError(e instanceof Error ? e.message : String(e))
  }
  if (!res.ok) throw new Error(`Sheet fetch failed (${res.status}) for “${tabName}”`)
  const text = await res.text()
  if (text.trimStart().startsWith('<!') || text.includes('google.visualization.Query.setResponse')) {
    throw new Error(`Tab “${tabName}” not readable (missing or not shared)`)
  }
  return text
}

export async function fetchSheetCsv(sheetId: string, tabName: string): Promise<string[][]> {
  return parseCsv(await fetchSheetText(sheetId, tabName))
}

/** Known first tab of the dogfood workbook — the only tab allowed to equal the gviz default. */
export const DEFAULT_FIRST_TAB = 'KGA Eng CW'

/** Try the public htmlview tab list (may be CORS-blocked in browsers → null). */
export async function fetchTabNames(sheetId: string): Promise<string[] | null> {
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`)
    if (!res.ok) return null
    const html = await res.text()
    const names = [...html.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]!)
    return names.length ? names : null
  } catch {
    return null
  }
}

export type Discovery = {
  tabs: DiscoveredTab[]
  rejected: string[]
  source: 'tab-list' | 'probe'
  /** name → raw CSV text, reused by pull to avoid refetch */
  csv: Map<string, string>
}

/**
 * Discover real readable teaching tabs. gviz returns the DEFAULT tab (HTTP 200) for a
 * missing name — fingerprint that and reject any candidate whose CSV is byte-identical,
 * except the real first tab.
 */
export async function discoverTabs(sheetId: string): Promise<Discovery> {
  let netFails = 0
  let attempts = 0
  const missing = await fetchSheetText(sheetId, `__sow_missing_${Date.now().toString(36)}__`).catch(
    (e) => {
      if (e instanceof OfflineError) netFails++
      return ''
    },
  )
  attempts++
  const listed = await fetchTabNames(sheetId)
  const firstTab = listed?.[0] ?? DEFAULT_FIRST_TAB
  const candidates = listed
    ? listed.filter((n) => classKeyForTab(n))
    : (Object.values(CLASS_LABELS) as string[]).concat(
        ['KGA Sci CW', 'KGB Sci HW', 'KGA Math HW', 'KGB Math CW'].filter((n) => classKeyForTab(n)),
      )
  const tabs: DiscoveredTab[] = []
  const rejected: string[] = []
  const csv = new Map<string, string>()
  for (const name of candidates) {
    const key = classKeyForTab(name)
    if (!key) continue
    let text: string
    attempts++
    try {
      text = await fetchSheetText(sheetId, name)
    } catch (e) {
      if (e instanceof OfflineError) netFails++
      rejected.push(name)
      continue
    }
    if (missing && text === missing && name !== firstTab) {
      rejected.push(name)
      continue
    }
    const hasRoll = parseCsv(text).some(
      (r) => /^\d+$/.test(String(r[0] ?? '').trim()) && String(r[1] ?? '').trim(),
    )
    if (!hasRoll) {
      rejected.push(name)
      continue
    }
    csv.set(name, text)
    tabs.push({ name, classKey: key, subject: subjectOf(key) })
  }
  // P1-2: every request failed at network level → offline, not "no tabs".
  if (!tabs.length && netFails > 0 && netFails === attempts) throw new OfflineError()
  return { tabs, rejected, source: listed ? 'tab-list' : 'probe', csv }
}

export async function testSheetReadable(sheetId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const d = await discoverTabs(sheetId)
    if (!d.tabs.length) return { ok: false, message: 'Opened workbook but found no readable teaching tabs.' }
    return {
      ok: true,
      message: `Workbook reachable · ${d.tabs.length} tab(s): ${d.tabs.map((t) => t.name).join(' · ')}`,
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}
