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
import { DEMO_SESSIONS, ROSTERS, type DemoSession } from './workspaceData'

type WorkspaceValue = {
  ready: boolean
  activeClassKey: ClassKey
  setActiveClassKey: (k: ClassKey) => void
  marksByClass: MarksByClass
  setMarksForClass: (classKey: ClassKey, next: MarksMap | ((prev: MarksMap) => MarksMap)) => void
  sessions: DemoSession[]
  rosterFor: (k: ClassKey) => RostersByClass[ClassKey]
  /** Reload marks/rosters from IDB (after sync pull). */
  reloadFromIdb: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [activeClassKey, setActiveClassKey] = useState<ClassKey>('KGA_Eng_CW')
  const [marksByClass, setMarksByClass] = useState<MarksByClass>(() => ({
    KGA_Eng_CW: {},
    KGB_Eng_CW: {},
    KGA_Eng_HW: {},
    KGB_Eng_HW: {},
  }))
  const [rosters, setRosters] = useState<RostersByClass>(() => ({ ...ROSTERS }))
  const persistTimer = useRef<number | null>(null)
  const pendingPersist = useRef<ClassKey | null>(null)

  const reloadFromIdb = useCallback(async () => {
    const loaded = await loadWorkspaceFromIdb()
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
        void persistClassMarks(key, marks, roster)
      }, 280)
    },
    [rosters],
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
      sessions: DEMO_SESSIONS,
      rosterFor: (k) => (rosters[k]?.length ? rosters[k] : ROSTERS[k]),
      reloadFromIdb,
    }),
    [ready, activeClassKey, marksByClass, setMarksForClass, rosters, reloadFromIdb],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace outside WorkspaceProvider')
  return ctx
}
