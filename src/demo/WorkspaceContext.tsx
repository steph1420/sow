import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { MarksMap } from '../checklist/types'
import type { ClassKey } from '../data/types'
import {
  loadWorkspaceFromIdb,
  persistClassMarks,
  type MarksByClass,
  type RostersByClass,
} from '../data/persistWorkspace'
import type { DateSlot } from '../checklist/types'
import type { Session } from '../data/types'
import { listSessions } from '../data/api'
import {
  DEMO_SESSIONS,
  ROSTERS,
  WORKSPACE_DATES,
  datesFromSession,
  sessionsFromIdb,
  type DemoSession,
} from './workspaceData'

type WorkspaceValue = {
  ready: boolean
  activeClassKey: ClassKey
  setActiveClassKey: (k: ClassKey) => void
  marksByClass: MarksByClass
  setMarksForClass: (classKey: ClassKey, next: MarksMap | ((prev: MarksMap) => MarksMap)) => void
  sessions: DemoSession[]
  /** True when Overview/Checklist bind pulled sheet sessions (not demo). */
  fromSheet: boolean
  /** Checklist date slots for a class — pulled Current, else demo. */
  datesFor: (k: ClassKey) => [DateSlot, DateSlot]
  rosterFor: (k: ClassKey) => RostersByClass[ClassKey]
  /** Reload marks/rosters from IDB (after sync pull). */
  reloadFromIdb: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [activeClassKey, setActiveClassKey] = useState<ClassKey>('KGA_Eng_CW')
  const [marksByClass, setMarksByClass] = useState<MarksByClass>(() => {
    const empty = {} as MarksByClass
    for (const k of Object.keys(ROSTERS) as ClassKey[]) empty[k] = {}
    return empty
  })
  const [rosters, setRosters] = useState<RostersByClass>(() => ({ ...ROSTERS }))
  const [pulledSessions, setPulledSessions] = useState<Session[]>([])
  const persistTimer = useRef<number | null>(null)
  const pendingPersist = useRef<ClassKey | null>(null)

  const reloadFromIdb = useCallback(async () => {
    const loaded = await loadWorkspaceFromIdb()
    setPulledSessions((await listSessions()).filter((s) => s.sessionId.endsWith('|current')))
    if (loaded.hasStudents) {
      setRosters(loaded.rosters)
      setMarksByClass(loaded.marksByClass)
    } else {
      setRosters({ ...ROSTERS })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await reloadFromIdb()
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadFromIdb])

  const flushPersist = useCallback(
    (classKey: ClassKey, marks: MarksMap) => {
      pendingPersist.current = classKey
      if (persistTimer.current) window.clearTimeout(persistTimer.current)
      persistTimer.current = window.setTimeout(() => {
        const key = pendingPersist.current
        if (!key) return
        const roster = rosters[key]?.length ? rosters[key] : ROSTERS[key]
        void persistClassMarks(key, marks, roster, datesForRef.current(key))
      }, 280)
    },
    [rosters],
  )

  const datesFor = useCallback(
    (k: ClassKey): [DateSlot, DateSlot] => {
      const s = pulledSessions.find((x) => x.classKey === k)
      return s ? datesFromSession(s) : WORKSPACE_DATES
    },
    [pulledSessions],
  )
  const datesForRef = useRef(datesFor)
  datesForRef.current = datesFor

  const rosterFor = useCallback(
    (k: ClassKey) => (rosters[k]?.length ? rosters[k] : ROSTERS[k]),
    [rosters],
  )

  const sessions = useMemo(
    () =>
      pulledSessions.length
        ? sessionsFromIdb(pulledSessions, (k) => rosterFor(k).length)
        : DEMO_SESSIONS,
    [pulledSessions, rosterFor],
  )

  const setMarksForClass = useCallback(
    (classKey: ClassKey, next: MarksMap | ((prev: MarksMap) => MarksMap)) => {
      setMarksByClass((prev) => {
        const cur = prev[classKey]
        const resolved = typeof next === 'function' ? next(cur) : next
        flushPersist(classKey, resolved)
        return { ...prev, [classKey]: resolved }
      })
    },
    [flushPersist],
  )

  const value = useMemo<WorkspaceValue>(
    () => ({
      ready,
      activeClassKey,
      setActiveClassKey,
      marksByClass,
      setMarksForClass,
      sessions,
      fromSheet: pulledSessions.length > 0,
      datesFor,
      rosterFor,
      reloadFromIdb,
    }),
    [ready, activeClassKey, marksByClass, setMarksForClass, sessions, pulledSessions, datesFor, rosterFor, reloadFromIdb],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace outside WorkspaceProvider')
  return ctx
}
