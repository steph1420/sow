import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CLASS_KEYS,
  CLASS_LABELS,
  getSettings,
  listMarks,
  listSessions,
  deleteMark,
  putMark,
  putSession,
  putSettings,
  rosterWithLeft,
  setAllMarks,
  toggleMarkField,
  type ClassKey,
  type Mark,
  type Session,
} from '../db'
import { parseClassParam } from '../lib/classMeta'
import { presentLettersFromNames } from '../lib/azScrubber'
import { loadPrefs, subscribePrefs, type UndoChrome } from '../lib/sowPrefs'
import { shortDateLabel } from '../lib/shortDate'
import CalendarSheet from '../components/CalendarSheet'
import {
  canRedo,
  canUndo,
  popRedo,
  popUndo,
  pushUndo,
  type MarkSnap,
} from '../lib/undoStack'
import AzScrubber from '../components/AzScrubber'
import '../styles/mark.css'

type Mode = 'set' | 'submitted'
type SetFilter = 'all' | 'finished' | 'pending'
type SubFilter = 'all' | 'submitted' | 'not'
type SortMode = 'name-asc' | 'name-desc' | 'roll-asc' | 'roll-desc' | 'pending-first'
type Sheet = null | 'class' | 'cal' | 'sort' | 'filters' | 'actions'
type ColMode = '1' | '2'
type DateSlot = 'd1' | 'd2'

const HOLD_PAINT_MS = 180
const HOLD_SELECT_MS = 800
/** Finger slop (px) before hold is cancelled / drag starts — all platforms. */
const HOLD_SLOP_PX = 12
/** Vertical drift allowed during horizontal paint (not free diagonal). */
const PAINT_VERT_SLOP_PX = 28
/** Horizontal distance toward opposite ✓ to commit paint. */
const PAINT_COMMIT_PX = 22

function classTitle(key: ClassKey): string {
  const label = CLASS_LABELS[key]
  const [grade, ...rest] = label.split(' ')
  return `${grade} · ${rest.join(' ')}`
}

function snapOf(m: Mark | undefined, roll: number, name: string, date: string, topic: string): MarkSnap {
  return {
    roll,
    name,
    date,
    topic,
    set: !!m?.set,
    submitted: !!m?.submitted,
  }
}

export default function MarkPage() {
  const [params, setParams] = useSearchParams()
  const [classKey, setClassKey] = useState<ClassKey>(() => parseClassParam(params.get('class')) ?? 'KGA_Eng_CW')
  useEffect(() => {
    const fromUrl = parseClassParam(params.get('class'))
    if (fromUrl && fromUrl !== classKey) setClassKey(fromUrl)
  }, [params, classKey])

  const [session, setSession] = useState<Session | null>(null)
  const [roster, setRoster] = useState<(Awaited<ReturnType<typeof rosterWithLeft>>)>([])
  const [marks, setMarks] = useState<Mark[]>([])
  const [hideLeft, setHideLeft] = useState(false)
  const [mode, setMode] = useState<Mode>('set')
  const [setFilter, setSetFilter] = useState<SetFilter>(() => {
    const d = loadPrefs()['filter.default']
    return d === 'pending' ? 'pending' : 'all'
  })
  const [subFilter, setSubFilter] = useState<SubFilter>('all')
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [jumpLetter, setJumpLetter] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('name-asc')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [colMode, setColMode] = useState<ColMode>('1')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [undoChrome, setUndoChrome] = useState<UndoChrome>(() => loadPrefs()['undo.chrome'])
  const [prefs, setPrefs] = useState(() => loadPrefs())
  useEffect(
    () =>
      subscribePrefs((p) => {
        setUndoChrome(p['undo.chrome'])
        setPrefs(p)
      }),
    [],
  )
  useEffect(() => {
    document.documentElement.style.setProperty('--az-idle-width', `${prefs['az.idleWidth']}px`)
    document.documentElement.style.setProperty('--az-inset-right', `${prefs['az.insetRight']}px`)
  }, [prefs])
  const [stackTick, setStackTick] = useState(0)

  const [topicToast, setTopicToast] = useState(false)
  const [topicEditing, setTopicEditing] = useState(false)
  const [topicDraft, setTopicDraft] = useState('')
  const topicInputRef = useRef<HTMLInputElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Hold-paint / select gesture refs
  const paintRef = useRef<{
    roll: number
    from: DateSlot
    startX: number
    startY: number
    held: boolean
    painted: boolean
    timer: number | null
  } | null>(null)
  const nameHoldRef = useRef<{
    roll: number
    startX: number
    startY: number
    timer: number | null
  } | null>(null)
  const rollDragRef = useRef<{
    active: boolean
    add: boolean
    lastRoll: number | null
  }>({ active: false, add: true, lastRoll: null })
  const [paintUi, setPaintUi] = useState<{ roll: number; from: DateSlot; to?: DateSlot } | null>(null)

  useLayoutEffect(() => {
    const head = headRef.current
    if (!head) return
    const main = head.closest('.main') as HTMLElement | null
    const apply = () => {
      const headBottom = head.getBoundingClientRect().bottom
      const scrollY = main?.scrollTop ?? 0
      const top = Math.max(0, Math.round(headBottom + scrollY))
      document.documentElement.style.setProperty('--az-top', `${top}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(head)
    if (main) ro.observe(main)
    window.addEventListener('resize', apply)
    main?.addEventListener('scroll', apply, { passive: true })
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
      main?.removeEventListener('scroll', apply)
    }
  }, [roster.length, searchOpen, topicToast, topicEditing, sheet, mode, setFilter, prefs, colMode, selectMode])

  const reload = useCallback(async () => {
    const [sessions, ros, settings] = await Promise.all([
      listSessions(classKey),
      rosterWithLeft(classKey),
      getSettings(),
    ])
    const sess = sessions[0] ?? null
    setSession(sess)
    setRoster(ros)
    setHideLeft(!!settings.hideLeft)
    if (sess) {
      const all = await listMarks(classKey)
      setMarks(all)
      setActiveDate((cur) => {
        const dates = [sess.date1, sess.date2].filter(Boolean)
        if (cur && dates.includes(cur)) return cur
        return dates[0] ?? null
      })
      if (!sess.date2) setColMode('1')
    } else {
      setMarks([])
      setActiveDate(null)
      setColMode('1')
    }
  }, [classKey])

  // On first session load with date2, prefer 2-col once
  const didInitCol = useRef(false)
  useEffect(() => {
    if (!session) return
    if (didInitCol.current) return
    didInitCol.current = true
    setColMode(session.date2 ? '2' : '1')
  }, [session])

  useEffect(() => {
    didInitCol.current = false
    void reload()
    setJumpLetter(null)
    setQ('')
    setTopicToast(false)
    setTopicEditing(false)
    setSheet(null)
    setSelectMode(false)
    setSelected(new Set())
  }, [reload])

  const dates = useMemo(() => {
    if (!session) return [] as { date: string; topic: string; slot: DateSlot }[]
    const out: { date: string; topic: string; slot: DateSlot }[] = [
      { date: session.date1, topic: session.topic1, slot: 'd1' },
    ]
    if (session.date2) out.push({ date: session.date2, topic: session.topic2, slot: 'd2' })
    return out.filter((d) => d.date)
  }, [session])

  const hasTwoDates = dates.length >= 2
  const showTwoCol = hasTwoDates && colMode === '2'

  const activeSlot = useMemo(
    () => dates.find((d) => d.date === activeDate) ?? dates[0] ?? null,
    [dates, activeDate],
  )

  const markMap = useMemo(() => {
    const m = new Map<string, Mark>()
    for (const row of marks) m.set(`${row.roll}|${row.date}`, row)
    return m
  }, [marks])

  const activeRoster = useMemo(() => roster.filter((s) => !s.left), [roster])

  const countFor = useCallback(
    (date: string) => {
      let n = 0
      for (const s of activeRoster) {
        if (markMap.get(`${s.roll}|${date}`)?.set) n++
      }
      return n
    },
    [activeRoster, markMap],
  )

  const setStatus = useMemo(() => {
    if (!activeSlot) return { setCount: 0, active: activeRoster.length }
    return { setCount: countFor(activeSlot.date), active: activeRoster.length }
  }, [activeRoster, activeSlot, countFor])

  const rows = useMemo(() => {
    let list = hideLeft ? roster.filter((s) => !s.left) : roster.slice()
    const qq = q.trim().toLowerCase()
    if (qq) list = list.filter((s) => s.name.toLowerCase().includes(qq) || String(s.roll).includes(qq))
    // Letter filter removed — A–Z is scroll-to only

    const dateForFilter = activeSlot?.date
    if (dateForFilter && (setFilter !== 'all' || subFilter !== 'all')) {
      list = list.filter((s) => {
        if (s.left) return false
        const m = markMap.get(`${s.roll}|${dateForFilter}`)
        if (setFilter === 'finished' && !m?.set) return false
        if (setFilter === 'pending' && m?.set) return false
        if (subFilter === 'submitted' && !m?.submitted) return false
        if (subFilter === 'not' && m?.submitted) return false
        return true
      })
    }

    const pendingOf = (s: (typeof list)[0]) => {
      if (!activeSlot || s.left) return 0
      const m = markMap.get(`${s.roll}|${activeSlot.date}`)
      return mode === 'set' ? (m?.set ? 0 : 1) : m?.submitted ? 0 : 1
    }

    list = list.slice().sort((a, b) => {
      switch (sortMode) {
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'roll-asc':
          return a.roll - b.roll
        case 'roll-desc':
          return b.roll - a.roll
        case 'pending-first': {
          const dp = pendingOf(b) - pendingOf(a)
          if (dp !== 0) return dp
          return a.name.localeCompare(b.name)
        }
        case 'name-asc':
        default:
          return a.name.localeCompare(b.name)
      }
    })
    return list
  }, [roster, hideLeft, q, setFilter, subFilter, activeSlot, markMap, sortMode, mode])

  const presentLetters = useMemo(() => {
    const list = hideLeft ? roster.filter((s) => !s.left) : roster
    return presentLettersFromNames(list.map((s) => s.name))
  }, [roster, hideLeft])

  const undoOk = canUndo(classKey)
  const redoOk = canRedo(classKey)
  void stackTick

  async function applySnaps(snaps: MarkSnap[]) {
    for (const s of snaps) {
      await putMark({
        classKey,
        roll: s.roll,
        name: s.name,
        date: s.date,
        topic: s.topic,
        set: s.set,
        submitted: s.submitted,
      })
    }
    await reload()
  }

  async function onTap(roll: number, name: string, date: string, topic: string, left: boolean) {
    if (left) return
    const before = [snapOf(markMap.get(`${roll}|${date}`), roll, name, date, topic)]
    await toggleMarkField(classKey, roll, date, mode, name, topic)
    const afterMark = await listMarks(classKey)
    const m = afterMark.find((x) => x.roll === roll && x.date === date)
    const after = [snapOf(m, roll, name, date, topic)]
    pushUndo(classKey, { undo: before, redo: after })
    setStackTick((t) => t + 1)
    await reload()
  }

  async function onCheckAll(date: string, topic: string) {
    const visible = rows.filter((s) => !s.left)
    const before = visible.map((s) => snapOf(markMap.get(`${s.roll}|${date}`), s.roll, s.name, date, topic))
    const allOn =
      visible.length > 0 &&
      visible.every((s) => {
        const m = markMap.get(`${s.roll}|${date}`)
        return mode === 'set' ? !!m?.set : !!m?.submitted
      })
    await setAllMarks(classKey, date, topic, mode, !allOn, rows)
    const afterMarks = await listMarks(classKey)
    const afterMap = new Map(afterMarks.map((m) => [`${m.roll}|${m.date}`, m]))
    const after = visible.map((s) => snapOf(afterMap.get(`${s.roll}|${date}`), s.roll, s.name, date, topic))
    pushUndo(classKey, { undo: before, redo: after })
    setStackTick((t) => t + 1)
    await reload()
  }

  async function onUndo() {
    const entry = popUndo(classKey)
    if (!entry) return
    setStackTick((t) => t + 1)
    await applySnaps(entry.undo)
  }

  async function onRedo() {
    const entry = popRedo(classKey)
    if (!entry) return
    setStackTick((t) => t + 1)
    await applySnaps(entry.redo)
  }

  function selectClass(k: ClassKey) {
    setClassKey(k)
    setParams({ class: k })
    setSheet(null)
  }

  async function confirmCalendar(sheetDate: string) {
    if (dates.some((d) => d.date === sheetDate)) {
      setActiveDate(sheetDate)
      setSheet(null)
      return
    }
    if (!session || !activeSlot) {
      setActiveDate(sheetDate)
      setSheet(null)
      return
    }
    const oldDate = activeSlot.date
    if (oldDate === sheetDate) {
      setActiveDate(sheetDate)
      setSheet(null)
      return
    }
    const next: Session = { ...session }
    if (oldDate === session.date1) next.date1 = sheetDate
    else if (oldDate === session.date2) next.date2 = sheetDate
    else next.date1 = sheetDate

    const oldMarks = marks.filter((m) => m.date === oldDate)
    for (const m of oldMarks) {
      await putMark({
        classKey,
        roll: m.roll,
        name: m.name,
        date: sheetDate,
        topic: m.topic,
        set: m.set,
        submitted: m.submitted,
      })
      await deleteMark(m.markId)
    }
    await putSession(next)
    setActiveDate(sheetDate)
    setSheet(null)
    await reload()
  }

  function openTopicToast() {
    if (topicEditing) return
    setTopicToast(true)
  }

  function startTopicEdit() {
    setTopicDraft(activeSlot?.topic ?? '')
    setTopicToast(false)
    setTopicEditing(true)
    requestAnimationFrame(() => topicInputRef.current?.focus())
  }

  async function commitTopic() {
    if (!session || !activeSlot) {
      setTopicEditing(false)
      return
    }
    const text = topicDraft.trim()
    const next: Session = { ...session }
    if (activeSlot.date === session.date1) next.topic1 = text
    else if (activeSlot.date === session.date2) next.topic2 = text
    const saved = await putSession(next)
    setSession(saved)
    setTopicEditing(false)
  }

  async function clearTopic() {
    setTopicDraft('')
    topicInputRef.current?.focus()
  }

  async function toggleHideLeft() {
    const next = !hideLeft
    setHideLeft(next)
    await putSettings({ hideLeft: next })
  }

  function clearAllFilters() {
    setSetFilter('all')
    setSubFilter('all')
    setQ('')
    setSearchOpen(false)
  }

  const filtersActive = setFilter !== 'all' || subFilter !== 'all' || q.trim() !== '' || hideLeft

  const topicText = activeSlot?.topic ?? ''

  function onAzJump(letter: string | null) {
    setJumpLetter(letter)
    const main = listRef.current?.closest('.main') as HTMLElement | null
    if (!letter) {
      main?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const target = rows.find((s) => s.name.toUpperCase().startsWith(letter))
    if (!target) return
    const el = listRef.current?.querySelector(`[data-roll="${target.roll}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  function exitSelect() {
    setSelectMode(false)
    setSelected(new Set())
    setSheet(null)
  }

  function toggleSelected(roll: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(roll)) next.delete(roll)
      else next.add(roll)
      return next
    })
  }

  // —— Hold-paint (either ✓ → opposite, ~180ms, forgiving slop) ——
  function paintDown(e: ReactPointerEvent, roll: number, from: DateSlot, left: boolean) {
    if (left || selectMode || !hasTwoDates || !showTwoCol) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    if (paintRef.current?.timer) window.clearTimeout(paintRef.current.timer)
    const timer = window.setTimeout(() => {
      if (paintRef.current && paintRef.current.roll === roll) {
        paintRef.current.held = true
        setPaintUi({ roll, from })
      }
    }, HOLD_PAINT_MS)
    paintRef.current = {
      roll,
      from,
      startX: e.clientX,
      startY: e.clientY,
      held: false,
      painted: false,
      timer,
    }
  }

  function paintMove(e: ReactPointerEvent) {
    const g = paintRef.current
    if (!g) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    if (!g.held) {
      // Cancel hold only if finger moves beyond slop before 180ms
      if (Math.hypot(dx, dy) > HOLD_SLOP_PX) {
        if (g.timer) window.clearTimeout(g.timer)
        paintRef.current = null
        setPaintUi(null)
      }
      return
    }
    // Held: require mostly horizontal; tolerate vertical drift
    if (Math.abs(dy) > PAINT_VERT_SLOP_PX && Math.abs(dy) > Math.abs(dx) * 1.2) return
    const towardRight = g.from === 'd1' && dx > PAINT_COMMIT_PX
    const towardLeft = g.from === 'd2' && dx < -PAINT_COMMIT_PX
    if (towardRight || towardLeft) {
      const to: DateSlot = g.from === 'd1' ? 'd2' : 'd1'
      g.painted = true
      setPaintUi({ roll: g.roll, from: g.from, to })
    }
  }

  async function paintUp(e: ReactPointerEvent, roll: number, name: string, left: boolean) {
    const g = paintRef.current
    if (g?.timer) window.clearTimeout(g.timer)
    paintRef.current = null
    setPaintUi(null)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* */
    }
    if (left || !session) return
    if (g && g.roll === roll && g.painted && g.held) {
      const fromDate = g.from === 'd1' ? session.date1 : session.date2
      const toDate = g.from === 'd1' ? session.date2 : session.date1
      const fromTopic = g.from === 'd1' ? session.topic1 : session.topic2
      const toTopic = g.from === 'd1' ? session.topic2 : session.topic1
      if (!fromDate || !toDate) return
      // Ensure from is on, then paint to
      const before = [
        snapOf(markMap.get(`${roll}|${fromDate}`), roll, name, fromDate, fromTopic),
        snapOf(markMap.get(`${roll}|${toDate}`), roll, name, toDate, toTopic),
      ]
      const fromMark = markMap.get(`${roll}|${fromDate}`)
      const fieldOn = mode === 'set' ? !!fromMark?.set : !!fromMark?.submitted
      // Turn on both (paint ticks both)
      await putMark({
        classKey,
        roll,
        name,
        date: fromDate,
        topic: fromTopic,
        set: mode === 'set' ? true : !!fromMark?.set,
        submitted: mode === 'submitted' ? true : !!fromMark?.submitted,
      })
      const toExisting = markMap.get(`${roll}|${toDate}`)
      await putMark({
        classKey,
        roll,
        name,
        date: toDate,
        topic: toTopic,
        set: mode === 'set' ? true : !!toExisting?.set,
        submitted: mode === 'submitted' ? true : !!toExisting?.submitted,
      })
      const afterMarks = await listMarks(classKey)
      const after = [
        snapOf(
          afterMarks.find((x) => x.roll === roll && x.date === fromDate),
          roll,
          name,
          fromDate,
          fromTopic,
        ),
        snapOf(
          afterMarks.find((x) => x.roll === roll && x.date === toDate),
          roll,
          name,
          toDate,
          toTopic,
        ),
      ]
      pushUndo(classKey, { undo: before, redo: after })
      setStackTick((t) => t + 1)
      await reload()
      void fieldOn
      return
    }
    // Short tap → normal toggle on this date
    if (g && g.roll === roll && !g.held && !g.painted) {
      const date = g.from === 'd1' ? session.date1 : session.date2
      const topic = g.from === 'd1' ? session.topic1 : session.topic2
      if (date) await onTap(roll, name, date, topic, left)
    }
  }

  // —— Name hold → select mode (800ms, forgiving slop) ——
  function nameDown(e: ReactPointerEvent, roll: number, left: boolean) {
    if (left) return
    if (selectMode) {
      toggleSelected(roll)
      return
    }
    if (nameHoldRef.current?.timer) window.clearTimeout(nameHoldRef.current.timer)
    const timer = window.setTimeout(() => {
      if (nameHoldRef.current && nameHoldRef.current.roll === roll) {
        setSelectMode(true)
        setSelected(new Set([roll]))
        nameHoldRef.current = null
      }
    }, HOLD_SELECT_MS)
    nameHoldRef.current = { roll, startX: e.clientX, startY: e.clientY, timer }
  }

  function nameMove(e: ReactPointerEvent) {
    const g = nameHoldRef.current
    if (!g) return
    if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > HOLD_SLOP_PX) {
      if (g.timer) window.clearTimeout(g.timer)
      nameHoldRef.current = null
    }
  }

  function nameUp() {
    if (nameHoldRef.current?.timer) window.clearTimeout(nameHoldRef.current.timer)
    nameHoldRef.current = null
  }

  // —— Roll drag-to-select ——
  function rollDown(e: ReactPointerEvent, roll: number, left: boolean) {
    if (!selectMode || left) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const adding = !selected.has(roll)
    rollDragRef.current = { active: true, add: adding, lastRoll: roll }
    setSelected((prev) => {
      const next = new Set(prev)
      if (adding) next.add(roll)
      else next.delete(roll)
      return next
    })
  }

  function rollMove(e: ReactPointerEvent) {
    if (!rollDragRef.current.active || !listRef.current) return
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const row = el?.closest('[data-roll]') as HTMLElement | null
    if (!row) return
    const roll = Number(row.dataset.roll)
    if (!Number.isFinite(roll) || roll === rollDragRef.current.lastRoll) return
    rollDragRef.current.lastRoll = roll
    const adding = rollDragRef.current.add
    setSelected((prev) => {
      const next = new Set(prev)
      if (adding) next.add(roll)
      else next.delete(roll)
      return next
    })
  }

  function rollUp(e: ReactPointerEvent) {
    rollDragRef.current.active = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* */
    }
  }

  async function runBulkCopy(dir: '1to2' | '2to1') {
    if (!session || !hasTwoDates || selected.size === 0) return
    const fromDate = dir === '1to2' ? session.date1 : session.date2
    const toDate = dir === '1to2' ? session.date2 : session.date1
    const fromTopic = dir === '1to2' ? session.topic1 : session.topic2
    const toTopic = dir === '1to2' ? session.topic2 : session.topic1
    const targets = rows.filter((s) => selected.has(s.roll) && !s.left)
    const before: MarkSnap[] = []
    const after: MarkSnap[] = []
    for (const s of targets) {
      const src = markMap.get(`${s.roll}|${fromDate}`)
      const dst = markMap.get(`${s.roll}|${toDate}`)
      before.push(snapOf(dst, s.roll, s.name, toDate, toTopic))
      await putMark({
        classKey,
        roll: s.roll,
        name: s.name,
        date: toDate,
        topic: toTopic,
        set: mode === 'set' ? !!src?.set : !!dst?.set,
        submitted: mode === 'submitted' ? !!src?.submitted : !!dst?.submitted,
      })
      // Also keep opposite field from dst when copying only active mode field
      if (mode === 'set') {
        await putMark({
          classKey,
          roll: s.roll,
          name: s.name,
          date: toDate,
          topic: toTopic,
          set: !!src?.set,
          submitted: !!dst?.submitted,
        })
      } else {
        await putMark({
          classKey,
          roll: s.roll,
          name: s.name,
          date: toDate,
          topic: toTopic,
          set: !!dst?.set,
          submitted: !!src?.submitted,
        })
      }
      void fromTopic
      const updated = (await listMarks(classKey)).find((x) => x.roll === s.roll && x.date === toDate)
      after.push(snapOf(updated, s.roll, s.name, toDate, toTopic))
    }
    pushUndo(classKey, { undo: before, redo: after })
    setStackTick((t) => t + 1)
    setSheet(null)
    await reload()
  }

  async function runBulkClear(slot: DateSlot) {
    if (!session || selected.size === 0) return
    const date = slot === 'd1' ? session.date1 : session.date2
    const topic = slot === 'd1' ? session.topic1 : session.topic2
    if (!date) return
    const targets = rows.filter((s) => selected.has(s.roll) && !s.left)
    const before = targets.map((s) => snapOf(markMap.get(`${s.roll}|${date}`), s.roll, s.name, date, topic))
    for (const s of targets) {
      const existing = markMap.get(`${s.roll}|${date}`)
      await putMark({
        classKey,
        roll: s.roll,
        name: s.name,
        date,
        topic,
        set: mode === 'set' ? false : !!existing?.set,
        submitted: mode === 'submitted' ? false : !!existing?.submitted,
      })
    }
    const afterMarks = await listMarks(classKey)
    const after = targets.map((s) =>
      snapOf(
        afterMarks.find((x) => x.roll === s.roll && x.date === date),
        s.roll,
        s.name,
        date,
        topic,
      ),
    )
    pushUndo(classKey, { undo: before, redo: after })
    setStackTick((t) => t + 1)
    setSheet(null)
    await reload()
  }

  function checkClass(on: boolean): string {
    if (!on) return 'check'
    return mode === 'set' ? 'check set-on' : 'check sub-on'
  }

  function allOnFor(date: string): boolean {
    const visible = rows.filter((s) => !s.left)
    return (
      visible.length > 0 &&
      visible.every((s) => {
        const m = markMap.get(`${s.roll}|${date}`)
        return mode === 'set' ? !!m?.set : !!m?.submitted
      })
    )
  }

  if (!session) {
    return (
      <div className="mark">
        <div className="cl-head">
          <div className="cl-class">
            <span className="cl-lbl">Class</span>
            <button type="button" className="cl-value" onClick={() => setSheet('class')}>
              {classTitle(classKey)} <span className="caret">▾</span>
            </button>
          </div>
        </div>
        <div className="empty">
          No session for this class yet.{' '}
          <Link to={`/session?class=${classKey}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Open Session →
          </Link>
        </div>
        {sheet === 'class' ? (
          <SheetFrame title="Class" onClose={() => setSheet(null)}>
            {CLASS_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className={`sheet-row${k === classKey ? ' on' : ''}`}
                onClick={() => selectClass(k)}
              >
                {classTitle(k)}
              </button>
            ))}
          </SheetFrame>
        ) : null}
      </div>
    )
  }

  const d1 = dates[0]
  const d2 = dates[1]
  const selCount = selected.size
  const actionsEnabled = selCount >= 1

  return (
    <div className={`mark${selectMode ? ' selecting' : ''}`} data-undo-chrome={undoChrome}>
      {selectMode ? (
        <div className="cl-sel-bar">
          <div>
            <div className="title">{selCount} selected</div>
            <div className="sub">Tap name · scroll · drag roll #</div>
          </div>
          <button type="button" className="cl-sel-exit" aria-label="Exit select" onClick={exitSelect}>
            ✕
          </button>
        </div>
      ) : (
        <>
          <div className="cl-head">
            <div className="cl-class">
              <span className="cl-lbl">Class</span>
              <button type="button" className="cl-value" onClick={() => setSheet('class')}>
                {classTitle(classKey)} <span className="caret">▾</span>
              </button>
              <div className="cl-count">
                {hasTwoDates ? (
                  <>
                    <b>{countFor(session.date1)}</b> · <b>{countFor(session.date2)}</b> /{setStatus.active} set
                  </>
                ) : (
                  <>
                    <b>
                      {setStatus.setCount}/{setStatus.active}
                    </b>{' '}
                    set
                  </>
                )}
              </div>
            </div>
            <div className="cl-date">
              {hasTwoDates ? (
                <>
                  <span className="cl-lbl">View</span>
                  <div className="cl-view-tog" role="group" aria-label="Columns">
                    <button type="button" className={colMode === '1' ? 'on' : ''} onClick={() => setColMode('1')}>
                      1-col
                    </button>
                    <button type="button" className={colMode === '2' ? 'on' : ''} onClick={() => setColMode('2')}>
                      2-col
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="cl-lbl">Date</span>
                  <button type="button" className="cl-value" onClick={() => setSheet('cal')}>
                    {activeSlot ? shortDateLabel(activeSlot.date) : '—'} <span className="caret">▾</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {hasTwoDates ? (
            <div className="cl-date-pair">
              {d1 ? (
                <button
                  type="button"
                  className={`cl-dchip${!showTwoCol && activeSlot?.date === d1.date ? ' on' : ''}`}
                  onClick={() => {
                    setActiveDate(d1.date)
                    if (showTwoCol) setSheet('cal')
                    else setSheet('cal')
                  }}
                >
                  <div className="dl">Date 1{!showTwoCol && activeSlot?.date === d1.date ? ' · active' : ''}</div>
                  <div className="dd">{shortDateLabel(d1.date)} ▾</div>
                  <div className="dt">{d1.topic || '—'}</div>
                  <div className="cnt">
                    <b>{countFor(d1.date)}</b>/{setStatus.active}
                  </div>
                </button>
              ) : null}
              {d2 ? (
                <button
                  type="button"
                  className={`cl-dchip${!showTwoCol && activeSlot?.date === d2.date ? ' on' : ''}`}
                  onClick={() => {
                    setActiveDate(d2.date)
                    setSheet('cal')
                  }}
                >
                  <div className="dl">Date 2{!showTwoCol && activeSlot?.date === d2.date ? ' · active' : ''}</div>
                  <div className="dd">{shortDateLabel(d2.date)} ▾</div>
                  <div className="dt">{d2.topic || '—'}</div>
                  <div className="cnt">
                    <b>{countFor(d2.date)}</b>/{setStatus.active}
                  </div>
                </button>
              ) : null}
            </div>
          ) : (
            <div className="cl-topic-row">
              <div className="cl-topic">
                <span className="cl-lbl">Topic</span>
                {topicEditing ? (
                  <div className="cl-topic-edit">
                    <input
                      ref={topicInputRef}
                      value={topicDraft}
                      onChange={(e) => setTopicDraft(e.target.value)}
                      onBlur={() => void commitTopic()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void commitTopic()
                        }
                        if (e.key === 'Escape') setTopicEditing(false)
                      }}
                      aria-label="Edit topic"
                    />
                    <button
                      type="button"
                      className="cl-topic-x"
                      aria-label="Clear topic"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void clearTopic()}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button type="button" className="cl-topic-text" onClick={openTopicToast}>
                    {topicText || '—'}
                  </button>
                )}
              </div>
              <div className="cl-undo" data-undo-chrome={undoChrome}>
                <button type="button" className="cl-icon-btn" disabled={!undoOk} aria-label="Undo" onClick={() => void onUndo()}>
                  <span aria-hidden>↶</span>
                  {undoChrome === 'iconsLabel' ? <span className="cl-icon-lbl">Undo</span> : null}
                </button>
                <button type="button" className="cl-icon-btn" disabled={!redoOk} aria-label="Redo" onClick={() => void onRedo()}>
                  <span aria-hidden>↷</span>
                  {undoChrome === 'iconsLabel' ? <span className="cl-icon-lbl">Redo</span> : null}
                </button>
              </div>
            </div>
          )}

          {hasTwoDates ? (
            <div className="cl-topic-row">
              <div className="cl-undo" data-undo-chrome={undoChrome} style={{ marginLeft: 'auto' }}>
                <button type="button" className="cl-icon-btn" disabled={!undoOk} aria-label="Undo" onClick={() => void onUndo()}>
                  <span aria-hidden>↶</span>
                  {undoChrome === 'iconsLabel' ? <span className="cl-icon-lbl">Undo</span> : null}
                </button>
                <button type="button" className="cl-icon-btn" disabled={!redoOk} aria-label="Redo" onClick={() => void onRedo()}>
                  <span aria-hidden>↷</span>
                  {undoChrome === 'iconsLabel' ? <span className="cl-icon-lbl">Redo</span> : null}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {topicToast ? (
        <div className="cl-topic-toast" role="status">
          <p>{topicText || '—'}</p>
          <button type="button" className="cl-pencil" aria-label="Edit topic" onClick={startTopicEdit}>
            ✎
          </button>
          <button type="button" className="cl-toast-dismiss" aria-label="Dismiss" onClick={() => setTopicToast(false)}>
            ×
          </button>
        </div>
      ) : null}

      {!selectMode ? (
        <div className="cl-mode-row">
          <div className="mode">
            <button type="button" className={mode === 'set' ? 'on-set' : ''} onClick={() => setMode('set')}>
              Set
            </button>
            <button type="button" className={mode === 'submitted' ? 'on-sub' : ''} onClick={() => setMode('submitted')}>
              Submitted
            </button>
          </div>
          {hasTwoDates ? (
            <button type="button" className="cl-copy-chip" onClick={() => { setSelectMode(true); setSheet('actions') }}>
              ⎘ Copy…
            </button>
          ) : null}
        </div>
      ) : hasTwoDates ? (
        <div className="cl-date-pair">
          {d1 ? (
            <div className="cl-dchip">
              <div className="dl">Date 1</div>
              <div className="dd">{shortDateLabel(d1.date)}</div>
            </div>
          ) : null}
          {d2 ? (
            <div className="cl-dchip">
              <div className="dl">Date 2</div>
              <div className="dd">{shortDateLabel(d2.date)}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!selectMode ? (
        <div className="cl-chip-row">
          {prefs['filter.showPending'] ? (
            <button
              type="button"
              className={`chip${setFilter === 'pending' ? ' on' : ''}`}
              onClick={() => setSetFilter((c) => (c === 'pending' ? 'all' : 'pending'))}
            >
              <span className="dot" aria-hidden>
                ●
              </span>{' '}
              Pending
            </button>
          ) : null}
          {prefs['filter.showSearch'] ? (
            <button
              type="button"
              className={`cl-search-btn${searchOpen || q ? ' on' : ''}`}
              aria-label="Search"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((o) => !o)}
            >
              ⌕
            </button>
          ) : null}
        </div>
      ) : null}

      {searchOpen && !selectMode ? (
        <div className="search">
          <span>⌕</span>
          <input value={q} autoFocus onChange={(e) => setQ(e.target.value)} placeholder="Search name or roll" />
          {q ? (
            <button type="button" className="cl-topic-x" aria-label="Clear search" onClick={() => setQ('')}>
              ×
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={`head ${showTwoCol ? 'two-col' : 'one-col'}`} ref={headRef}>
        <span />
        <span className="n">Name</span>
        {showTwoCol && d1 && d2 ? (
          <>
            <span className="col-h">
              <span className="dh">{shortDateLabel(d1.date).replace(/^\w+ /, '')}</span>
              <button
                type="button"
                className={`all${allOnFor(d1.date) ? (mode === 'set' ? ' set' : ' sub') : ''}`}
                title="Check/uncheck all visible"
                onClick={() => void onCheckAll(d1.date, d1.topic)}
              >
                ✓
              </button>
            </span>
            <span className="col-h">
              <span className="dh">{shortDateLabel(d2.date).replace(/^\w+ /, '')}</span>
              <button
                type="button"
                className={`all${allOnFor(d2.date) ? (mode === 'set' ? ' set' : ' sub') : ''}`}
                title="Check/uncheck all visible"
                onClick={() => void onCheckAll(d2.date, d2.topic)}
              >
                ✓
              </button>
            </span>
          </>
        ) : activeSlot ? (
          <span className="col-h">
            <span className="dh">{shortDateLabel(activeSlot.date)}</span>
            <button
              type="button"
              className={`all${allOnFor(activeSlot.date) ? (mode === 'set' ? ' set' : ' sub') : ''}`}
              title="Check/uncheck all visible"
              onClick={() => void onCheckAll(activeSlot.date, activeSlot.topic)}
            >
              ✓
            </button>
          </span>
        ) : null}
      </div>

      <div className="list" ref={listRef}>
        {rows.length === 0 && <div className="empty">No students match these filters.</div>}
        {rows.map((s) => {
          const isSel = selected.has(s.roll)
          if (showTwoCol && d1 && d2) {
            const m1 = markMap.get(`${s.roll}|${d1.date}`)
            const m2 = markMap.get(`${s.roll}|${d2.date}`)
            const on1 = mode === 'set' ? !!m1?.set : !!m1?.submitted
            const on2 = mode === 'set' ? !!m2?.set : !!m2?.submitted
            const paintFrom = paintUi?.roll === s.roll ? paintUi.from : null
            const paintTo = paintUi?.roll === s.roll ? paintUi.to : null
            return (
              <div
                key={s.id}
                data-roll={s.roll}
                className={`row two-col${s.left ? ' left' : ''}${isSel ? ' sel' : ''}`}
              >
                <span
                  className="roll"
                  onPointerDown={(e) => rollDown(e, s.roll, s.left)}
                  onPointerMove={rollMove}
                  onPointerUp={rollUp}
                  onPointerCancel={rollUp}
                >
                  {s.roll}
                </span>
                <span
                  className="name"
                  onPointerDown={(e) => nameDown(e, s.roll, s.left)}
                  onPointerMove={nameMove}
                  onPointerUp={nameUp}
                  onPointerCancel={nameUp}
                >
                  {s.name}
                  {s.left ? <span className="badge">Left</span> : null}
                </span>
                <button
                  type="button"
                  className="check-hit"
                  disabled={s.left || selectMode}
                  aria-label={`Mark date 1 for ${s.name}`}
                  onPointerDown={(e) => paintDown(e, s.roll, 'd1', s.left)}
                  onPointerMove={paintMove}
                  onPointerUp={(e) => void paintUp(e, s.roll, s.name, s.left)}
                  onPointerCancel={(e) => void paintUp(e, s.roll, s.name, s.left)}
                >
                  <span
                    className={`${checkClass(on1)}${paintFrom === 'd1' ? ' hold' : ''}${paintTo === 'd1' ? ' paint' : ''}`}
                  >
                    ✓
                  </span>
                </button>
                <button
                  type="button"
                  className="check-hit"
                  disabled={s.left || selectMode}
                  aria-label={`Mark date 2 for ${s.name}`}
                  onPointerDown={(e) => paintDown(e, s.roll, 'd2', s.left)}
                  onPointerMove={paintMove}
                  onPointerUp={(e) => void paintUp(e, s.roll, s.name, s.left)}
                  onPointerCancel={(e) => void paintUp(e, s.roll, s.name, s.left)}
                >
                  <span
                    className={`${checkClass(on2)}${paintFrom === 'd2' ? ' hold' : ''}${paintTo === 'd2' ? ' paint' : ''}`}
                  >
                    ✓
                  </span>
                </button>
              </div>
            )
          }

          if (!activeSlot) return null
          const m = markMap.get(`${s.roll}|${activeSlot.date}`)
          const on = mode === 'set' ? !!m?.set : !!m?.submitted
          return (
            <div
              key={s.id}
              data-roll={s.roll}
              className={`row one-col${s.left ? ' left' : ''}${isSel ? ' sel' : ''}`}
            >
              <span
                className="roll"
                onPointerDown={(e) => rollDown(e, s.roll, s.left)}
                onPointerMove={rollMove}
                onPointerUp={rollUp}
                onPointerCancel={rollUp}
              >
                {s.roll}
              </span>
              <span
                className="name"
                onPointerDown={(e) => nameDown(e, s.roll, s.left)}
                onPointerMove={nameMove}
                onPointerUp={nameUp}
                onPointerCancel={nameUp}
              >
                {s.name}
                {s.left ? <span className="badge">Left</span> : null}
              </span>
              <button
                type="button"
                className="check-hit"
                disabled={s.left || selectMode}
                aria-label={`Mark ${s.name}`}
                onClick={() => void onTap(s.roll, s.name, activeSlot.date, activeSlot.topic, s.left)}
              >
                <span className={checkClass(on)}>✓</span>
              </button>
            </div>
          )
        })}
      </div>

      {roster.length > 0 && (
        <AzScrubber active={jumpLetter} present={presentLetters} onJump={onAzJump} />
      )}

      {selectMode ? (
        <button type="button" className="cl-ctx-fab" onClick={() => setSheet('actions')}>
          Actions ▾ · {selCount}
        </button>
      ) : (
        <div className="cl-fab" role="toolbar" aria-label="Sort and filters">
          {prefs['filter.showSort'] ? (
            <button type="button" className="cl-fab-btn" onClick={() => setSheet('sort')}>
              <span className="cl-fab-ico" aria-hidden>
                ⇅
              </span>
              Sort
            </button>
          ) : null}
          <button
            type="button"
            className={`cl-fab-btn${filtersActive ? ' active' : ''}`}
            onClick={() => setSheet('filters')}
          >
            <span className="cl-fab-ico" aria-hidden>
              ☰{filtersActive ? <i className="cl-fab-dot" /> : null}
            </span>
            Filters
          </button>
        </div>
      )}

      {sheet === 'class' ? (
        <SheetFrame title="Class" onClose={() => setSheet(null)}>
          {CLASS_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className={`sheet-row${k === classKey ? ' on' : ''}`}
              onClick={() => selectClass(k)}
            >
              {classTitle(k)}
            </button>
          ))}
        </SheetFrame>
      ) : null}

      {sheet === 'cal' ? (
        <CalendarSheet
          appliedDate={activeSlot?.date ?? activeDate}
          sessionDates={dates.map((d) => d.date)}
          onCancel={() => setSheet(null)}
          onConfirm={(d) => void confirmCalendar(d)}
        />
      ) : null}

      {sheet === 'sort' ? (
        <SheetFrame title="Sort" onClose={() => setSheet(null)}>
          {(
            [
              ['name-asc', 'Name A–Z'],
              ['name-desc', 'Name Z–A'],
              ['roll-asc', 'Roll ↑'],
              ['roll-desc', 'Roll ↓'],
              ['pending-first', 'Pending first'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`sheet-row${sortMode === id ? ' on' : ''}`}
              onClick={() => {
                setSortMode(id)
                setSheet(null)
              }}
            >
              {label}
            </button>
          ))}
        </SheetFrame>
      ) : null}

      {sheet === 'filters' ? (
        <SheetFrame title="Filters" onClose={() => setSheet(null)}>
          <button
            type="button"
            className={`sheet-row${setFilter === 'pending' ? ' on' : ''}`}
            onClick={() => {
              setSetFilter((c) => (c === 'pending' ? 'all' : 'pending'))
              setSubFilter('all')
            }}
          >
            Pending only
          </button>
          <button
            type="button"
            className={`sheet-row${setFilter === 'finished' ? ' on' : ''}`}
            onClick={() => {
              setSetFilter((c) => (c === 'finished' ? 'all' : 'finished'))
              setSubFilter('all')
            }}
          >
            Finished only
          </button>
          <button
            type="button"
            className={`sheet-row${subFilter === 'submitted' ? ' on' : ''}`}
            onClick={() => {
              setSubFilter((c) => (c === 'submitted' ? 'all' : 'submitted'))
              setSetFilter('all')
            }}
          >
            Submitted only
          </button>
          <button type="button" className={`sheet-row${hideLeft ? ' on' : ''}`} onClick={() => void toggleHideLeft()}>
            Hide Left
          </button>
          <button
            type="button"
            className="sheet-row"
            onClick={() => {
              clearAllFilters()
              setSheet(null)
            }}
          >
            Clear all
          </button>
        </SheetFrame>
      ) : null}

      {sheet === 'actions' && hasTwoDates && d1 && d2 ? (
        <SheetFrame
          title={`Actions · ${selCount} selected`}
          onClose={() => setSheet(null)}
          dismissOnScrim={false}
          hint={
            actionsEnabled
              ? 'Stays open — tap outside does nothing · ✕ to dismiss'
              : '0 selected = none · select names first'
          }
        >
          <button
            type="button"
            className="sheet-row"
            disabled={!actionsEnabled}
            onClick={() => void runBulkCopy('1to2')}
          >
            Copy {shortDateLabel(d1.date)} → {shortDateLabel(d2.date)}
            <span className="sheet-meta">date1 → date2</span>
          </button>
          <button
            type="button"
            className="sheet-row"
            disabled={!actionsEnabled}
            onClick={() => void runBulkCopy('2to1')}
          >
            Copy {shortDateLabel(d2.date)} → {shortDateLabel(d1.date)}
            <span className="sheet-meta">date2 → date1</span>
          </button>
          <button
            type="button"
            className="sheet-row danger"
            disabled={!actionsEnabled}
            onClick={() => void runBulkClear('d1')}
          >
            Clear {shortDateLabel(d1.date)}
            <span className="sheet-meta">date1</span>
          </button>
          <button
            type="button"
            className="sheet-row danger"
            disabled={!actionsEnabled}
            onClick={() => void runBulkClear('d2')}
          >
            Clear {shortDateLabel(d2.date)}
            <span className="sheet-meta">date2</span>
          </button>
        </SheetFrame>
      ) : null}
    </div>
  )
}

function SheetFrame({
  title,
  onClose,
  children,
  dismissOnScrim = true,
  hint,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  dismissOnScrim?: boolean
  hint?: string
}) {
  return (
    <div className="cl-sheet-layer" role="presentation">
      <button
        type="button"
        className={`cl-sheet-scrim${dismissOnScrim ? '' : ' locked'}`}
        aria-label={dismissOnScrim ? 'Close' : 'Sheet open'}
        onClick={dismissOnScrim ? onClose : undefined}
      />
      <div className="cl-sheet" role="dialog" aria-label={title}>
        <div className="cl-sheet-handle" aria-hidden />
        <div className="cl-sheet-head">
          <h3>{title}</h3>
          <button type="button" className="cl-sheet-x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {hint ? <div className="cl-sheet-hint">{hint}</div> : null}
        <div className="cl-sheet-body">{children}</div>
      </div>
    </div>
  )
}
