import type { ClassKey } from '../data/types'
import { CLASS_LABELS } from '../data/types'
import type { DateSlot, MarksMap, StudentRow } from '../checklist/types'
import { markKey } from '../checklist/types'
import { DEMO_DATES, DEMO_ROSTER } from '../checklist/demoRoster'

export type DemoSession = {
  id: string
  classKey: ClassKey
  label: string // "KGA · Eng CW"
  group: 'KGA' | 'KGB'
  kind: 'CW' | 'HW'
  date: DateSlot
  /** Secondary date topics joined for expanded card */
  topics: string[]
  rosterSize: number
}

/** Extra names to pad KGA→42 / KGB→44 for glanceable remock-scale progress. */
const PAD_NAMES = [
  'Aarav Shah', 'Anika Bose', 'Atharv Jain', 'Avni Kapoor', 'Devansh Rao',
  'Ira Malhotra', 'Jiya Nair', 'Kabir Sethi', 'Myra Patel', 'Nathan Cruz',
  'Pari Mehta', 'Rudra Iyer', 'Siya Reddy', 'Tarak Das', 'Veda Krishnan',
  'Ayan Gupta', 'Chitra Menon', 'Darsh Pillai', 'Elena Roy', 'Freya Shah',
  'Girish Nair', 'Hana Bose', 'Inder Singh', 'Jatin Verma', 'Kriti Joshi',
  'Lina Kapoor', 'Milan Desai', 'Nisha Rao', 'Orhan Khan', 'Puneet Shah',
  'Qamar Ali', 'Ravi Menon', 'Sara Iyer', 'Uday Reddy', 'Varun Joshi',
  'Walia Khan', 'Xavier Dsouza', 'Yuvaan Shah', 'Zara Mehta', 'Abeer Nair',
]

function padRoster(base: StudentRow[], size: number, salt: number): StudentRow[] {
  const out = base.map((r) => ({ ...r }))
  let roll = out.length + 1
  let i = 0
  while (out.length < size) {
    const name = PAD_NAMES[(i + salt) % PAD_NAMES.length]!
    out.push({ roll, name: `${name}`, left: false })
    roll++
    i++
  }
  return out.slice(0, size)
}

export const WORKSPACE_DATES = DEMO_DATES

export const ROSTERS: Record<ClassKey, StudentRow[]> = {
  KGA_Eng_CW: padRoster(DEMO_ROSTER, 42, 0),
  KGB_Eng_CW: padRoster(DEMO_ROSTER, 44, 3),
  KGA_Eng_HW: padRoster(DEMO_ROSTER, 42, 7),
  KGB_Eng_HW: padRoster(DEMO_ROSTER, 44, 11),
}

function labelOf(key: ClassKey): string {
  return CLASS_LABELS[key].replace(' Eng ', ' · Eng ')
}

/** Overview sessions — one card per class · primary date glance (Lucid-mj2). */
export const DEMO_SESSIONS: DemoSession[] = [
  {
    id: 'KGA_Eng_CW|2026-10-28',
    classKey: 'KGA_Eng_CW',
    label: labelOf('KGA_Eng_CW'),
    group: 'KGA',
    kind: 'CW',
    date: DEMO_DATES[0],
    topics: [DEMO_DATES[0].topic, DEMO_DATES[1].topic],
    rosterSize: 42,
  },
  {
    id: 'KGB_Eng_CW|2026-10-28',
    classKey: 'KGB_Eng_CW',
    label: labelOf('KGB_Eng_CW'),
    group: 'KGB',
    kind: 'CW',
    date: DEMO_DATES[0],
    topics: ['Quiz prep'],
    rosterSize: 44,
  },
  {
    id: 'KGA_Eng_HW|2026-11-02',
    classKey: 'KGA_Eng_HW',
    label: labelOf('KGA_Eng_HW'),
    group: 'KGA',
    kind: 'HW',
    date: DEMO_DATES[1],
    topics: ['Spelling'],
    rosterSize: 42,
  },
  {
    id: 'KGB_Eng_HW|2026-11-02',
    classKey: 'KGB_Eng_HW',
    label: labelOf('KGB_Eng_HW'),
    group: 'KGB',
    kind: 'HW',
    date: DEMO_DATES[1],
    topics: [],
    rosterSize: 44,
  },
]

/** Deterministic seed marks per class (honest demo progress). */
export function seedClassMarks(classKey: ClassKey): MarksMap {
  const roster = ROSTERS[classKey]
  const m: MarksMap = {}
  const d0 = DEMO_DATES[0].date
  const d1 = DEMO_DATES[1].date
  const salt = classKey.length
  for (const s of roster) {
    const r = s.roll + salt
    const on0 = r % 3 !== 0
    const on1 = r % 4 === 0 || r % 5 === 0
    m[markKey(s.roll, d0)] = { set: on0, submitted: r % 7 === 0 }
    m[markKey(s.roll, d1)] = { set: on1, submitted: r % 9 === 0 }
  }
  // Tune KGA CW toward remock ~18/42 set / ~11 submitted on date0
  if (classKey === 'KGA_Eng_CW') {
    for (const s of roster) {
      const k0 = markKey(s.roll, d0)
      m[k0] = {
        set: s.roll <= 18,
        submitted: s.roll <= 11,
      }
      const k1 = markKey(s.roll, d1)
      m[k1] = {
        set: s.roll % 2 === 0 && s.roll <= 20,
        submitted: s.roll % 5 === 0,
      }
    }
  }
  if (classKey === 'KGB_Eng_CW') {
    for (const s of roster) {
      m[markKey(s.roll, d0)] = { set: s.roll <= 15, submitted: s.roll <= 8 }
    }
  }
  if (classKey === 'KGA_Eng_HW') {
    for (const s of roster) {
      m[markKey(s.roll, d1)] = { set: s.roll <= 38, submitted: s.roll <= 30 }
    }
  }
  if (classKey === 'KGB_Eng_HW') {
    for (const s of roster) {
      m[markKey(s.roll, d1)] = { set: s.roll <= 8, submitted: s.roll <= 3 }
    }
  }
  return m
}

export function seedAllMarks(): Record<ClassKey, MarksMap> {
  return {
    KGA_Eng_CW: seedClassMarks('KGA_Eng_CW'),
    KGB_Eng_CW: seedClassMarks('KGB_Eng_CW'),
    KGA_Eng_HW: seedClassMarks('KGA_Eng_HW'),
    KGB_Eng_HW: seedClassMarks('KGB_Eng_HW'),
  }
}

export type SessionProgress = {
  set: number
  submitted: number
  total: number
  pct: number
  tone: 'hi' | 'ok' | 'warn' | 'low'
}

export function progressForSession(
  marks: MarksMap,
  roster: StudentRow[],
  date: string,
): SessionProgress {
  const active = roster.filter((r) => !r.left)
  let set = 0
  let submitted = 0
  for (const r of active) {
    const m = marks[markKey(r.roll, date)] ?? { set: false, submitted: false }
    if (m.set) set++
    if (m.submitted) submitted++
  }
  const total = active.length || 1
  const pct = Math.round((set / total) * 100)
  const tone: SessionProgress['tone'] =
    pct >= 80 ? 'hi' : pct >= 40 ? 'ok' : pct >= 25 ? 'warn' : 'low'
  return { set, submitted, total: active.length, pct, tone }
}
