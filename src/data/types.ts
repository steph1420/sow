/** Field names aligned with docs/SHEET_MAPPING.md */

export type SubjectId = 'Eng' | 'Math' | 'Sci'

export type ClassKey =
  | 'KGA_Eng_CW'
  | 'KGB_Eng_CW'
  | 'KGA_Eng_HW'
  | 'KGB_Eng_HW'
  | 'KGA_Math_CW'
  | 'KGB_Math_HW'

export const CLASS_KEYS: ClassKey[] = [
  'KGA_Eng_CW',
  'KGB_Eng_CW',
  'KGA_Math_CW',
  'KGA_Eng_HW',
  'KGB_Eng_HW',
  'KGB_Math_HW',
]

/** Eng sheet tabs — Sync A pull path. */
export const ENG_CLASS_KEYS: ClassKey[] = [
  'KGA_Eng_CW',
  'KGB_Eng_CW',
  'KGA_Eng_HW',
  'KGB_Eng_HW',
]

export const CLASS_LABELS: Record<ClassKey, string> = {
  KGA_Eng_CW: 'KGA Eng CW',
  KGB_Eng_CW: 'KGB Eng CW',
  KGA_Eng_HW: 'KGA Eng HW',
  KGB_Eng_HW: 'KGB Eng HW',
  KGA_Math_CW: 'KGA Math CW',
  KGB_Math_HW: 'KGB Math HW',
}

export function subjectOf(key: ClassKey): SubjectId {
  if (key.includes('_Math_')) return 'Math'
  if (key.includes('_Sci_')) return 'Sci'
  return 'Eng'
}

export function classKeysForSubject(subject: SubjectId): ClassKey[] {
  return CLASS_KEYS.filter((k) => subjectOf(k) === subject)
}

export function prettyClassLabel(key: ClassKey): string {
  return CLASS_LABELS[key]
    .replace(' Eng ', ' · Eng ')
    .replace(' Math ', ' · Math ')
    .replace(' Sci ', ' · Sci ')
}

export interface Student {
  /** `${classKey}|${roll}` */
  id: string
  classKey: ClassKey
  roll: number
  name: string
}

export interface RosterMeta {
  /** `${classKey}|${roll}` */
  id: string
  classKey: ClassKey
  roll: number
  name: string
  left: boolean
  updatedAt: string
}

export interface Session {
  sessionId: string
  classKey: ClassKey
  date1: string
  topic1: string
  date2: string
  topic2: string
  createdAt: string
  updatedAt: string
}

export interface Mark {
  markId: string
  classKey: ClassKey
  roll: number
  name: string
  date: string
  topic: string
  set: boolean
  submitted: boolean
  updatedAt: string
}

/** Per-class Eng sync snapshot (Sync A). */
export type EngSyncState = {
  hash: string
  sheetSeenAt: string
  lastSyncAt: string
}

export interface Settings {
  id: 'app'
  hideLeft: boolean
  sheetUrl: string
  /** Apps Script web app URL for push / ensure SoW_* tabs */
  syncUrl: string
  theme: 'night' | 'day'
  seededAt?: string
  lastSyncAt?: string
  lastSyncError?: string
  syncDirty?: boolean
  /** Sync A: Eng tick+Current hash + seen/sync times per classKey */
  engSyncState?: Partial<Record<ClassKey, EngSyncState>>
  /** Real readable teaching tabs discovered on the workbook (v0.26 · t152u). */
  discoveredTabs?: DiscoveredTab[]
  discoveredAt?: string
}

export type DiscoveredTab = { name: string; classKey: ClassKey; subject: SubjectId }

/** Sheet tab name → ClassKey (only keys the app models). */
export function classKeyForTab(name: string): ClassKey | null {
  const m = String(name).trim().match(/^(KG[AB])\s+(Eng|Math|Sci)\s+(CW|HW)$/i)
  if (!m) return null
  const key = `${m[1]!.toUpperCase()}_${m[2]![0]!.toUpperCase()}${m[2]!.slice(1).toLowerCase()}_${m[3]!.toUpperCase()}`
  return (CLASS_KEYS as string[]).includes(key) ? (key as ClassKey) : null
}

export function studentId(classKey: ClassKey, roll: number): string {
  return `${classKey}|${roll}`
}

export function markId(classKey: ClassKey, roll: number, date: string): string {
  return `${classKey}|${roll}|${date}`
}
