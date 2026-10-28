export type MarkMode = 'set' | 'submitted'

export type DateSlot = {
  date: string
  topic: string
  dayLabel: string // e.g. "Wed 28"
  dayNum: string // e.g. "28"
}

export type StudentRow = {
  roll: number
  name: string
  left: boolean
}

/** Per-student per-date mark state for one mode field pair. */
export type MarkState = {
  set: boolean
  submitted: boolean
}

export type MarksMap = Record<string, MarkState> // key = `${roll}|${date}`

export function markKey(roll: number, date: string): string {
  return `${roll}|${date}`
}

export type ColPills = [boolean, boolean]

export type SelectAction = 'mark' | 'clear' | 'done'
