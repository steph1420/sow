import { describe, expect, it } from 'vitest'
import { filterAndSortRoster } from './filterSort'
import type { MarkFlags, RosterRow } from '../types'

const roster: RosterRow[] = [
  { roll: 1, name: 'Ada', left: false },
  { roll: 2, name: 'Ben', left: false },
  { roll: 3, name: 'Cara', left: true },
  { roll: 4, name: 'Dee', left: false },
]

const marks = new Map<string, MarkFlags>([
  ['1|28/10', { set: true, submitted: false }],
  ['2|28/10', { set: false, submitted: false }],
  ['4|28/10', { set: true, submitted: true }],
])

const markOf = (roll: number, date: string) => marks.get(`${roll}|${date}`)

describe('filterAndSortRoster', () => {
  it('filters by query name or roll', () => {
    const byName = filterAndSortRoster({
      roster, hideLeft: false, q: 'ad', setFilter: 'all', subFilter: 'all',
      sortMode: 'name-asc', mode: 'set', filterDate: '28/10', markOf,
    })
    expect(byName.map((r) => r.name)).toEqual(['Ada'])

    const byRoll = filterAndSortRoster({
      roster, hideLeft: false, q: '4', setFilter: 'all', subFilter: 'all',
      sortMode: 'name-asc', mode: 'set', filterDate: '28/10', markOf,
    })
    expect(byRoll.map((r) => r.roll)).toEqual([4])
  })

  it('pending filter keeps unset active students', () => {
    const rows = filterAndSortRoster({
      roster, hideLeft: true, q: '', setFilter: 'pending', subFilter: 'all',
      sortMode: 'name-asc', mode: 'set', filterDate: '28/10', markOf,
    })
    expect(rows.map((r) => r.name)).toEqual(['Ben'])
  })

  it('hides left when hideLeft', () => {
    const rows = filterAndSortRoster({
      roster, hideLeft: true, q: '', setFilter: 'all', subFilter: 'all',
      sortMode: 'roll-asc', mode: 'set', filterDate: null, markOf,
    })
    expect(rows.map((r) => r.roll)).toEqual([1, 2, 4])
  })

  it('sorts pending-first', () => {
    const rows = filterAndSortRoster({
      roster, hideLeft: true, q: '', setFilter: 'all', subFilter: 'all',
      sortMode: 'pending-first', mode: 'set', filterDate: '28/10', markOf,
    })
    expect(rows.map((r) => r.name)).toEqual(['Ben', 'Ada', 'Dee'])
  })

  it('sorts name-desc', () => {
    const rows = filterAndSortRoster({
      roster, hideLeft: true, q: '', setFilter: 'all', subFilter: 'all',
      sortMode: 'name-desc', mode: 'set', filterDate: null, markOf,
    })
    expect(rows.map((r) => r.name)).toEqual(['Dee', 'Ben', 'Ada'])
  })
})
