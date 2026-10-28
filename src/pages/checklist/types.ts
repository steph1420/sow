/** Checklist rebuild types — Wave A / Quiet contracts. */

export type Mode = 'set' | 'submitted'
export type SetFilter = 'all' | 'finished' | 'pending'
export type SubFilter = 'all' | 'submitted' | 'not'
export type SortMode = 'name-asc' | 'name-desc' | 'roll-asc' | 'roll-desc' | 'pending-first'
export type DateSlot = 'd1' | 'd2'
export type ColPills = { d1: boolean; d2: boolean }
export type ChecklistSheet = null | 'class' | 'cal' | 'sort' | 'filters' | 'actions'

export type DateInfo = {
  date: string
  topic: string
  slot: DateSlot
}

export type RosterRow = {
  roll: number
  name: string
  left: boolean
}

export type MarkFlags = {
  set?: boolean
  submitted?: boolean
}
