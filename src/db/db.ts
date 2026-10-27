import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Mark, RosterMeta, Session, Settings, Student } from './types'

interface SowDB extends DBSchema {
  students: { key: string; value: Student; indexes: { 'by-class': string } }
  rosterMeta: { key: string; value: RosterMeta; indexes: { 'by-class': string } }
  sessions: { key: string; value: Session; indexes: { 'by-class': string } }
  marks: {
    key: string
    value: Mark
    indexes: { 'by-class': string; 'by-class-date': [string, string] }
  }
  settings: { key: string; value: Settings }
}

const DB_NAME = 'sow-pwa'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<SowDB>> | null = null

export function getDb(): Promise<IDBPDatabase<SowDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const students = db.createObjectStore('students', { keyPath: 'id' })
        students.createIndex('by-class', 'classKey')

        const roster = db.createObjectStore('rosterMeta', { keyPath: 'id' })
        roster.createIndex('by-class', 'classKey')

        const sessions = db.createObjectStore('sessions', { keyPath: 'sessionId' })
        sessions.createIndex('by-class', 'classKey')

        const marks = db.createObjectStore('marks', { keyPath: 'markId' })
        marks.createIndex('by-class', 'classKey')
        marks.createIndex('by-class-date', ['classKey', 'date'])

        db.createObjectStore('settings', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

/** Test helper — resets the module promise after deleting the DB. */
export async function resetDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })
}
