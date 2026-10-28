import { useMemo, useState } from 'react'
import { loadPrefs } from '../../../lib/sowPrefs'
import { filterAndSortRoster } from '../lib/filterSort'
import type { Mark } from '../../../db'
import type { Mode, RosterRow, SetFilter, SortMode, SubFilter } from '../types'

export function useChecklistFilters(
  roster: RosterRow[],
  hideLeft: boolean,
  markMap: Map<string, Mark>,
  filterDate: string | null,
  mode: Mode,
) {
  const [setFilter, setSetFilter] = useState<SetFilter>(() => {
    const d = loadPrefs()['filter.default']
    return d === 'pending' ? 'pending' : 'all'
  })
  const [subFilter, setSubFilter] = useState<SubFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('name-asc')
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const rows = useMemo(
    () =>
      filterAndSortRoster({
        roster,
        hideLeft,
        q,
        setFilter,
        subFilter,
        sortMode,
        mode,
        filterDate,
        markOf: (roll, date) => markMap.get(`${roll}|${date}`),
      }),
    [roster, hideLeft, q, setFilter, subFilter, sortMode, mode, filterDate, markMap],
  )

  return {
    setFilter,
    setSetFilter,
    subFilter,
    setSubFilter,
    sortMode,
    setSortMode,
    q,
    setQ,
    searchOpen,
    setSearchOpen,
    rows,
  }
}
