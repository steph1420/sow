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
import { parseRoute } from '../nav/route'
import {
  loadWorkspaceFromIdb,
  persistClassMarks,
  type MarksByClass,
  type RostersByClass,
} from '../data/persistWorkspace'
import type { DateSlot } from '../checklist/types'
import type { Session } from '../data/types'
import { getSettings, listSessions } from '../data/api'
import type { DiscoveredTab } from '../data/types'
import {
  DEMO_SESSIONS,
  ROSTERS,
  WORKSPACE_DATES,
  datesFromSession,
  sessionsFromIdb,
  historyFromIdb,
  type DemoSession,
} from './workspaceData'

type WorkspaceValue = {
  ready: boolean
  activeClassKey: ClassKey
  setActiveClassKey: (k: ClassKey) => void
  marksByClass: MarksByClass
  setMarksForClass: (classKey: ClassKey, next: MarksMap | ((prev: MarksMap) => MarksMap)) => void
  sessions: DemoSession[]
  /** P2-1: History rows — every pulled date per class (demo sessions before first Sync). */
  historySessions: DemoSession[]
  /** True when Overview/Checklist bind pulled sheet sessions (not demo). */
  fromSheet: boolean
  /** Checklist date slots for a class — pulled Current, else demo. */
  datesFor: (k: ClassKey) => [DateSlot, DateSlot]
  rosterFor: (k: ClassKey) => RostersByClass[ClassKey]
  /** Classes on the user's sheet (pulled/discovered). Empty until first Sync. */
  classKeys: ClassKey[]
  sheetTabs: DiscoveredTab[]
  lastSyncAt?: string
  /** Reload marks/rosters from IDB (after sync pull). */
  reloadFromIdb: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [activeClassKey, setActiveClassKey] = useState<ClassKey>(
    () => (typeof window !== 'undefined' ? parseRoute(window.location.hash).classKey : undefined) ?? 'KGA_Eng_CW',
  )
  const [marksByClass, setMarksByClass] = useState<MarksByClass>(() => {
    const empty = {} as MarksByClass
    for (const k of Object.keys(ROSTERS) as ClassKey[]) empty[k] = {}
    return empty
  })
  const [rosters, setRosters] = useState<RostersByClass>(() => ({ ...ROSTERS }))
  const [pulledSessions, setPulledSessions] = useState<Session[]>([])
  const [sheetTabs, setSheetTabs] = useState<DiscoveredTab[]>([])
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>()
  const persistTimer = useRef<number | null>(null)
  const pendingPersist = useRef<ClassKey | null>(null)

  const reloadFromIdb = useCallback(async () => {
    const loaded = await loadWorkspaceFromIdb()
    const st = await getSettings()
    setSheetTabs(st.discoveredTabs ?? [])
    setLastSyncAt(st.lastSyncAt)
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
        : DEMO_SESSIONS.filter((s) => s.subject === 'Eng'), // no demo Math/Sci (t158u)
    [pulledSessions, rosterFor],
  )
  const historySessions = useMemo(
    () => (pulledSessions.length ? historyFromIdb(pulledSessions, (k) => rosterFor(k).length) : sessions),
    [pulledSessions, rosterFor, sessions],
  )

  const classKeys = useMemo<ClassKey[]>(() => {
    const ks = new Set<ClassKey>()
    for (const t of sheetTabs) ks.add(t.classKey)
    for (const s of pulledSessions) ks.add(s.classKey)
    return [...ks]
  }, [sheetTabs, pulledSessions])

  // v0.27.0: a deep link / stale hash to a class that isn't on the sheet (e.g. demo Math) falls back.
  useEffect(() => {
    if (!ready) return
    const allowed = classKeys.length ? classKeys : DEMO_SESSIONS.filter((x) => x.subject === 'Eng').map((x) => x.classKey)
    if (allowed.length && !allowed.includes(activeClassKey)) setActiveClassKey(allowed[0]!)
  }, [ready, classKeys, activeClassKey])

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
      historySessions,
      fromSheet: pulledSessions.length > 0,
      classKeys,
      sheetTabs,
      lastSyncAt,
      datesFor,
      rosterFor,
      reloadFromIdb,
    }),
    [classKeys, sheetTabs, lastSyncAt, ready, activeClassKey, marksByClass, setMarksForClass, sessions, historySessions, pulledSessions, datesFor, rosterFor, reloadFromIdb],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace outside WorkspaceProvider')
  return ctx
}
