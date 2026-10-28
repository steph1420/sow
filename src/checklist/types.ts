export type MarkMode = 'set' | 'submitted'

export type DateSlot = {
  date: string
  topic: string
  dayLabel: string // e.g. "Wed 28" (legacy long)
  /** Pill / topic date label — complete DD/MM (immersion t147u). */
  dayNum: string // e.g. "28/10"
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

/** Format ISO date YYYY-MM-DD → DD/MM. */
export function toDdMm(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return iso
  return `${Number(m[3])}/${Number(m[2])}`
}
