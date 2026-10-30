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
import { createPersistQueue, type PersistQueue } from './persistQueue'
import type { Session } from '../data/types'
import { getSettings, listSessions, putSettings, setLeft } from '../data/api'
import { applyTopicEdits, topicKey, type TopicEdits } from '../sync/topicEdits'
import { applyPick } from '../checklist/pickDate'
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
  /** v0.38.0: mark a pupil Left / Active (IDB rosterMeta → pushed by Sync). */
  setPupilLeft: (k: ClassKey, roll: number, left: boolean) => void
  /** v0.40.0 (t83u): edit a session topic locally (synced to the Sessions tab on next Sync). */
  setTopic: (k: ClassKey, date: string, topic: string) => void
  /** v0.41.0 (t103u/t108u): any date — a picked date replaces date 2 (calendar order kept). null = sheet dates. */
  pickDate: (k: ClassKey, slot: DateSlot | null) => void
  pickedFor: (k: ClassKey) => DateSlot | null
  /** Session dates known for a class (sheet history, current, added) → topic. */
  sessionDatesFor: (k: ClassKey) => Map<string, string>
  /** Add a session on a date with no session (pushed as a sessions op on the next Sync). */
  addSession: (k: ClassKey, date: string, topic: string) => void
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
  const [topicEdits, setTopicEdits] = useState<TopicEdits>({})
  const [picked, setPicked] = useState<Partial<Record<ClassKey, DateSlot>>>({})
  useEffect(() => { void getSettings().then((s) => setTopicEdits(s.topicEdits ?? {})).catch(() => {}) }, [])

  const marksRef = useRef(marksByClass)
  useEffect(() => {
    marksRef.current = marksByClass
  }, [marksByClass])

  const reloadFromIdb = useCallback(async () => {
    const loaded = await loadWorkspaceFromIdb()
    const st = await getSettings()
    setSheetTabs(st.discoveredTabs ?? [])
    setLastSyncAt(st.lastSyncAt)
    setTopicEdits(st.topicEdits ?? {})
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

  // v0.29.1: per-class queue (no class's edits dropped) + flush on pagehide / hidden.
  const rostersRef = useRef(rosters)
  rostersRef.current = rosters
  const queueRef = useRef<PersistQueue<ClassKey, MarksMap> | null>(null)
  if (!queueRef.current) {
    queueRef.current = createPersistQueue<ClassKey, MarksMap>((key, marks) => {
      const r = rostersRef.current[key]
      const roster = r?.length ? r : ROSTERS[key]
      void persistClassMarks(key, marks, roster, datesForRef.current(key))
    }, 280)
  }
  useEffect(() => {
    const flush = () => queueRef.current?.flushAll()
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('sow:flush', flush) // v0.30.1: before an update reload
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('sow:flush', flush)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  const flushPersist = useCallback((classKey: ClassKey, marks: MarksMap) => {
    queueRef.current?.schedule(classKey, marks)
  }, [])

  const datesFor = useCallback(
    (k: ClassKey): [DateSlot, DateSlot] => {
      const s = pulledSessions.find((x) => x.classKey === k)
      const base0 = s ? datesFromSession(s) : WORKSPACE_DATES
      const pk = picked[k]
      const base = pk ? applyPick(base0, pk) : base0
      return applyTopicEdits(k, base, topicEdits) as [DateSlot, DateSlot]
    },
    [pulledSessions, topicEdits, picked],
  )
  const datesForRef = useRef(datesFor)
  datesForRef.current = datesFor

  const setPupilLeft = useCallback((k: ClassKey, roll: number, left: boolean) => {
    let name = ''
    setRosters((prev) => {
      const base = prev[k]?.length ? prev[k] : ROSTERS[k]
      return { ...prev, [k]: base.map((r) => (r.roll === roll ? ((name = r.name), { ...r, left }) : r)) }
    })
    void setLeft(k, roll, left, name).catch(() => {})
  }, [])

  const setTopic = useCallback((k: ClassKey, date: string, topic: string) => {
    const t = topic.trim().slice(0, 200)
    if (!t) return
    const edit = { topic: t, updatedAt: new Date().toISOString() }
    setTopicEdits((prev) => ({ ...prev, [topicKey(k, date)]: edit }))
    void getSettings()
      .then((s) => putSettings({ topicEdits: { ...(s.topicEdits ?? {}), [topicKey(k, date)]: edit }, syncDirty: true }))
      .catch(() => {})
  }, [])

  const addSession = useCallback((k: ClassKey, date: string, topic: string) => {
    const edit = { topic: topic.trim().slice(0, 200), updatedAt: new Date().toISOString() }
    setTopicEdits((prev) => ({ ...prev, [topicKey(k, date)]: edit }))
    void getSettings()
      .then((s) => putSettings({ topicEdits: { ...(s.topicEdits ?? {}), [topicKey(k, date)]: edit }, syncDirty: true }))
      .catch(() => {})
  }, [])
  const pickDate = useCallback((k: ClassKey, slot: DateSlot | null) => {
    setPicked((prev) => { const n = { ...prev }; if (slot) n[k] = slot; else delete n[k]; return n })
  }, [])
  const pickedFor = useCallback((k: ClassKey) => picked[k] ?? null, [picked])

  const rosterFor = useCallback(
    (k: ClassKey) => (rosters[k]?.length ? rosters[k] : ROSTERS[k]),
    [rosters],
  )

  const sessions = useMemo(
    () =>
      (pulledSessions.length
        ? sessionsFromIdb(pulledSessions, (k) => rosterFor(k).length)
        : DEMO_SESSIONS.filter((s) => s.subject === 'Eng')
      ).map((s) => { const e = topicEdits[topicKey(s.classKey, s.date.date)]; return e ? { ...s, date: { ...s.date, topic: e.topic } } : s }), // no demo Math/Sci (t158u)
    [pulledSessions, rosterFor, topicEdits],
  )
  const historySessions = useMemo(
    () => (pulledSessions.length ? historyFromIdb(pulledSessions, (k) => rosterFor(k).length) : sessions),
    [pulledSessions, rosterFor, sessions],
  )

  const sessionDatesFor = useCallback((k: ClassKey) => {
    const m = new Map<string, string>()
    for (const h of historySessions) if (h.classKey === k) m.set(h.date.date, h.date.topic)
    const s = pulledSessions.find((x) => x.classKey === k)
    for (const d of s ? datesFromSession(s) : WORKSPACE_DATES) m.set(d.date, d.topic)
    for (const [key, e] of Object.entries(topicEdits)) { const [ck, date] = key.split('|'); if (ck === k && date) m.set(date, e.topic) }
    return m
  }, [historySessions, pulledSessions, topicEdits])

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
      // v0.31.1 tidy: no side effects inside the state updater (StrictMode runs updaters twice).
      // marksRef holds the newest marks (incl. not-yet-rendered ones) so back-to-back edits chain.
      const cur = marksRef.current[classKey]
      const resolved = typeof next === 'function' ? next(cur) : next
      marksRef.current = { ...marksRef.current, [classKey]: resolved }
      setMarksByClass((prev) => ({ ...prev, [classKey]: resolved }))
      flushPersist(classKey, resolved)
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
      setTopic,
      pickDate,
      pickedFor,
      sessionDatesFor,
      addSession,
      rosterFor,
      reloadFromIdb,
      setPupilLeft,
    }),
    [setPupilLeft, classKeys, sheetTabs, lastSyncAt, ready, activeClassKey, marksByClass, setMarksForClass, sessions, historySessions, pulledSessions, datesFor, setTopic, pickDate, pickedFor, sessionDatesFor, addSession, rosterFor, reloadFromIdb],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace outside WorkspaceProvider')
  return ctx
}
