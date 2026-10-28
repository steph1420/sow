import type { MarksMap, StudentRow } from '../checklist/types'
import { markKey } from '../checklist/types'
import { ROSTERS, seedAllMarks, WORKSPACE_DATES } from '../demo/workspaceData'
import { CLASS_KEYS, type ClassKey, markId as makeMarkId, studentId } from './types'
import {
  getSettings,
  listMarks,
  listStudents,
  putMark,
  putSettings,
  putStudent,
} from './api'

export type MarksByClass = Record<ClassKey, MarksMap>
export type RostersByClass = Record<ClassKey, StudentRow[]>

export function marksToMap(marks: { roll: number; date: string; set: boolean; submitted: boolean }[]): MarksMap {
  const m: MarksMap = {}
  for (const row of marks) {
    m[markKey(row.roll, row.date)] = { set: row.set, submitted: row.submitted }
  }
  return m
}

export function emptyMarksByClass(): MarksByClass {
  return {
    KGA_Eng_CW: {},
    KGB_Eng_CW: {},
    KGA_Eng_HW: {},
    KGB_Eng_HW: {},
  }
}

/** Load workspace marks + rosters from IDB. Missing class → empty. */
export async function loadWorkspaceFromIdb(): Promise<{
  marksByClass: MarksByClass
  rosters: RostersByClass
  hasStudents: boolean
}> {
  const marksByClass = emptyMarksByClass()
  const rosters = emptyRosters()
  let hasStudents = false

  for (const key of CLASS_KEYS) {
    const students = await listStudents(key)
    if (students.length) {
      hasStudents = true
      rosters[key] = students
        .map((s) => ({ roll: s.roll, name: s.name, left: false }))
        .sort((a, b) => a.roll - b.roll)
    }
    const marks = await listMarks(key)
    marksByClass[key] = marksToMap(marks)
  }

  return { marksByClass, rosters, hasStudents }
}

function emptyRosters(): RostersByClass {
  return {
    KGA_Eng_CW: [],
    KGB_Eng_CW: [],
    KGA_Eng_HW: [],
    KGB_Eng_HW: [],
  }
}

/** Seed demo roster + marks into IDB (offline-first dogfood). */
export async function seedDemoWorkspaceToIdb(): Promise<void> {
  const allMarks = seedAllMarks()
  const ts = new Date().toISOString()
  for (const key of CLASS_KEYS) {
    const roster = ROSTERS[key]
    for (const r of roster) {
      await putStudent({
        id: studentId(key, r.roll),
        classKey: key,
        roll: r.roll,
        name: r.name,
      })
    }
    const map = allMarks[key]
    for (const r of roster) {
      for (const d of WORKSPACE_DATES) {
        const cell = map[markKey(r.roll, d.date)] ?? { set: false, submitted: false }
        await putMark({
          markId: makeMarkId(key, r.roll, d.date),
          classKey: key,
          roll: r.roll,
          name: r.name,
          date: d.date,
          topic: d.topic,
          set: cell.set,
          submitted: cell.submitted,
          updatedAt: ts,
        })
      }
    }
  }
  await putSettings({
    sheetUrl:
      'https://docs.google.com/spreadsheets/d/1SdbZP8dHmNl2xhd9_srt6n-U2gqkQH8Aj7du5B5Mviw/edit',
    syncUrl: '',
    syncDirty: false,
  })
}

/** Persist one class marks map to IDB (overwrite those dates). */
export async function persistClassMarks(
  classKey: ClassKey,
  marks: MarksMap,
  roster: StudentRow[],
): Promise<void> {
  const ts = new Date().toISOString()
  const nameByRoll = new Map(roster.map((r) => [r.roll, r.name]))
  const dates = new Set<string>()
  for (const k of Object.keys(marks)) {
    const date = k.split('|')[1]
    if (date) dates.add(date)
  }
  for (const d of WORKSPACE_DATES) dates.add(d.date)

  for (const roll of nameByRoll.keys()) {
    for (const date of dates) {
      const cell = marks[markKey(roll, date)] ?? { set: false, submitted: false }
      const topic = WORKSPACE_DATES.find((x) => x.date === date)?.topic ?? ''
      await putMark({
        markId: makeMarkId(classKey, roll, date),
        classKey,
        roll,
        name: nameByRoll.get(roll) ?? '',
        date,
        topic,
        set: cell.set,
        submitted: cell.submitted,
        updatedAt: ts,
      })
    }
  }
  await putSettings({ syncDirty: true })
}

export async function readSyncStatus(): Promise<{
  sheetUrl: string
  syncUrl: string
  lastSyncAt?: string
  lastSyncError?: string
  syncDirty?: boolean
  connectedSheet: boolean
  connectedPush: boolean
}> {
  const s = await getSettings()
  return {
    sheetUrl: s.sheetUrl,
    syncUrl: s.syncUrl,
    lastSyncAt: s.lastSyncAt,
    lastSyncError: s.lastSyncError,
    syncDirty: s.syncDirty,
    connectedSheet: Boolean(s.sheetUrl && /spreadsheets/i.test(s.sheetUrl)),
    connectedPush: Boolean(s.syncUrl && /script\.google\.com/i.test(s.syncUrl)),
  }
}
