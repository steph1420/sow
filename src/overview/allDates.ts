/** v0.44.0 Overview › All dates: newest first, grouped by month; UPCOMING = after today. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export type AllDateRow = { iso: string; upcoming: boolean }
export function groupAllDates(isos: string[], today: string): { label: string; rows: AllDateRow[] }[] {
  const out: { label: string; rows: AllDateRow[] }[] = []
  for (const iso of [...new Set(isos)].sort().reverse()) {
    const label = `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
    let g = out[out.length - 1]
    if (!g || g.label !== label) { g = { label, rows: [] }; out.push(g) }
    g.rows.push({ iso, upcoming: iso > today })
  }
  return out
}
/** Past = older than the newest date currently shown on the checklist. */
export const isPastDate = (iso: string, current: string[]) => !current.includes(iso) && iso < [...current].sort().pop()!
