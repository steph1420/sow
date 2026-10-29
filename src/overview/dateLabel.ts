/** v0.39.0 (t79u/t81u): a card's date is the class's newest open session (bridge.ts newest-first) — label it truthfully. */
export function todayIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function sessionDateLabel(iso: string, today = todayIso()): '' | 'Upcoming' | 'Today' | 'Last' {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return ''
  const d = iso.slice(0, 10)
  return d > today ? 'Upcoming' : d === today ? 'Today' : 'Last'
}
