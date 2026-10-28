import type { MarkFlags, Mode, RosterRow, SetFilter, SortMode, SubFilter } from '../types'

export type FilterSortInput = {
  roster: RosterRow[]
  hideLeft: boolean
  q: string
  setFilter: SetFilter
  subFilter: SubFilter
  sortMode: SortMode
  mode: Mode
  /** Active date for pending/finished filters; null skips mark filters. */
  filterDate: string | null
  /** roll|date → mark flags */
  markOf: (roll: number, date: string) => MarkFlags | undefined
}

/** Live filter by name/roll + pending/finished/submitted + sort. A–Z never filters. */
export function filterAndSortRoster(input: FilterSortInput): RosterRow[] {
  const { roster, hideLeft, q, setFilter, subFilter, sortMode, mode, filterDate, markOf } = input
  let list = hideLeft ? roster.filter((s) => !s.left) : roster.slice()

  const qq = q.trim().toLowerCase()
  if (qq) {
    list = list.filter(
      (s) => s.name.toLowerCase().includes(qq) || String(s.roll).includes(qq),
    )
  }

  if (filterDate && (setFilter !== 'all' || subFilter !== 'all')) {
    list = list.filter((s) => {
      if (s.left) return false
      const m = markOf(s.roll, filterDate)
      if (setFilter === 'finished' && !m?.set) return false
      if (setFilter === 'pending' && m?.set) return false
      if (subFilter === 'submitted' && !m?.submitted) return false
      if (subFilter === 'not' && m?.submitted) return false
      return true
    })
  }

  const pendingOf = (s: RosterRow) => {
    if (!filterDate || s.left) return 0
    const m = markOf(s.roll, filterDate)
    return mode === 'set' ? (m?.set ? 0 : 1) : m?.submitted ? 0 : 1
  }

  return list.slice().sort((a, b) => {
    switch (sortMode) {
      case 'name-desc':
        return b.name.localeCompare(a.name)
      case 'roll-asc':
        return a.roll - b.roll
      case 'roll-desc':
        return b.roll - a.roll
      case 'pending-first': {
        const dp = pendingOf(b) - pendingOf(a)
        if (dp !== 0) return dp
        return a.name.localeCompare(b.name)
      }
      case 'name-asc':
      default:
        return a.name.localeCompare(b.name)
    }
  })
}
