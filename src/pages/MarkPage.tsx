import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
type Sheet = null | 'class' | 'cal' | 'sort' | 'filters'

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
  const [letter, setLetter] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('name-asc')
  const [sheet, setSheet] = useState<Sheet>(null)
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

  // Pin A–Z strip top below Name column header — scroll-invariant.
  // Using raw getBoundingClientRect().bottom on scroll made the strip taller as
  // the head left the viewport, and flex slots stretched letter gaps (Steve bug).
  // Compensate with main.scrollTop so --az-top stays fixed while the list scrolls.
  useLayoutEffect(() => {
    const head = headRef.current
    if (!head) return
    const main = head.closest('.main') as HTMLElement | null
    const apply = () => {
      const headBottom = head.getBoundingClientRect().bottom
      const scrollY = main?.scrollTop ?? 0
      // Viewport Y of head bottom when scrollTop === 0
      const top = Math.max(0, Math.round(headBottom + scrollY))
      document.documentElement.style.setProperty('--az-top', `${top}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(head)
    if (main) ro.observe(main)
    window.addEventListener('resize', apply)
    // Re-apply on scroll is a no-op for spacing (formula cancels scroll) but
    // keeps value correct if OfflineBanner / install bar toggles mid-scroll.
    main?.addEventListener('scroll', apply, { passive: true })
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
      main?.removeEventListener('scroll', apply)
    }
  }, [roster.length, searchOpen, topicToast, topicEditing, sheet, mode, setFilter, prefs])

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
    } else {
      setMarks([])
      setActiveDate(null)
    }
  }, [classKey])

  useEffect(() => {
    void reload()
    setLetter(null)
    setQ('')
    setTopicToast(false)
    setTopicEditing(false)
    setSheet(null)
  }, [reload])

  const dates = useMemo(() => {
    if (!session) return [] as { date: string; topic: string }[]
    const out = [{ date: session.date1, topic: session.topic1 }]
    if (session.date2) out.push({ date: session.date2, topic: session.topic2 })
    return out.filter((d) => d.date)
  }, [session])

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

  const setStatus = useMemo(() => {
    if (!activeSlot) return { setCount: 0, active: activeRoster.length }
    let setCount = 0
    for (const s of activeRoster) {
      if (markMap.get(`${s.roll}|${activeSlot.date}`)?.set) setCount++
    }
    return { setCount, active: activeRoster.length }
  }, [activeRoster, activeSlot, markMap])

  const rows = useMemo(() => {
    let list = hideLeft ? roster.filter((s) => !s.left) : roster.slice()
    const qq = q.trim().toLowerCase()
    if (qq) list = list.filter((s) => s.name.toLowerCase().includes(qq) || String(s.roll).includes(qq))
    if (letter) list = list.filter((s) => s.name.toUpperCase().startsWith(letter))

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
  }, [roster, hideLeft, q, letter, setFilter, subFilter, activeSlot, markMap, sortMode, mode])

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

  /** Confirm from calendar: select session date, or retarget active slot via putSession. */
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

    // Migrate marks on the old slot date → new date
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
    setLetter(null)
    setQ('')
    setSearchOpen(false)
  }

  const filtersActive =
    setFilter !== 'all' || subFilter !== 'all' || letter !== null || q.trim() !== '' || hideLeft

  const topicText = activeSlot?.topic ?? ''

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

  const dateLbl = activeSlot ? shortDateLabel(activeSlot.date) : '—'
  const allOn =
    !!activeSlot &&
    rows.filter((s) => !s.left).length > 0 &&
    rows
      .filter((s) => !s.left)
      .every((s) => {
        const m = markMap.get(`${s.roll}|${activeSlot.date}`)
        return mode === 'set' ? !!m?.set : !!m?.submitted
      })

  return (
    <div className="mark" data-undo-chrome={undoChrome}>
      {/* Header: class | date */}
      <div className="cl-head">
        <div className="cl-class">
          <span className="cl-lbl">Class</span>
          <button type="button" className="cl-value" onClick={() => setSheet('class')}>
            {classTitle(classKey)} <span className="caret">▾</span>
          </button>
          <div className="cl-count">
            <b>
              {setStatus.setCount}/{setStatus.active}
            </b>{' '}
            set
          </div>
        </div>
        <div className="cl-date">
          <span className="cl-lbl">Date</span>
          <button type="button" className="cl-value" onClick={() => setSheet('cal')}>
            {dateLbl} <span className="caret">▾</span>
          </button>
        </div>
      </div>

      {/* Topic + undo/redo */}
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
                  if (e.key === 'Escape') {
                    setTopicEditing(false)
                  }
                }}
                aria-label="Edit topic"
              />
              <button type="button" className="cl-topic-x" aria-label="Clear topic" onMouseDown={(e) => e.preventDefault()} onClick={() => void clearTopic()}>
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
          <button
            type="button"
            className="cl-icon-btn"
            disabled={!undoOk}
            aria-label="Undo"
            onClick={() => void onUndo()}
          >
            <span aria-hidden>↶</span>
            {undoChrome === 'iconsLabel' ? <span className="cl-icon-lbl">Undo</span> : null}
          </button>
          <button
            type="button"
            className="cl-icon-btn"
            disabled={!redoOk}
            aria-label="Redo"
            onClick={() => void onRedo()}
          >
            <span aria-hidden>↷</span>
            {undoChrome === 'iconsLabel' ? <span className="cl-icon-lbl">Redo</span> : null}
          </button>
        </div>
      </div>

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

      {/* Set | Submitted always on */}
      <div className="mode">
        <button type="button" className={mode === 'set' ? 'on-set' : ''} onClick={() => setMode('set')}>
          Set
        </button>
        <button type="button" className={mode === 'submitted' ? 'on-sub' : ''} onClick={() => setMode('submitted')}>
          Submitted
        </button>
      </div>

      {/* Quick chips + search icon */}
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

      {searchOpen ? (
        <div className="search">
          <span>⌕</span>
          <input
            value={q}
            autoFocus
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or roll"
          />
          {q ? (
            <button type="button" className="cl-topic-x" aria-label="Clear search" onClick={() => setQ('')}>
              ×
            </button>
          ) : null}
        </div>
      ) : null}

      {/* List header + rows */}
      <div className="head one-col" ref={headRef}>
        <span />
        <span className="n">Name</span>
        {activeSlot ? (
          <span className="col-h">
            <span className="dh">{shortDateLabel(activeSlot.date)}</span>
            <button
              type="button"
              className={`all${allOn ? (mode === 'set' ? ' set' : ' sub') : ''}`}
              title="Check/uncheck all visible"
              onClick={() => void onCheckAll(activeSlot.date, activeSlot.topic)}
            >
              ✓
            </button>
          </span>
        ) : null}
      </div>

      <div className="list">
        {rows.length === 0 && <div className="empty">No students match these filters.</div>}
        {rows.map((s) => {
          if (!activeSlot) return null
          const m = markMap.get(`${s.roll}|${activeSlot.date}`)
          const on = mode === 'set' ? !!m?.set : !!m?.submitted
          const cls = mode === 'set' ? (on ? 'check set-on' : 'check') : on ? 'check sub-on' : 'check'
          return (
            <div key={s.id} className={`row one-col${s.left ? ' left' : ''}`}>
              <span className="roll">{s.roll}</span>
              <span className="name">
                {s.name}
                {s.left ? <span className="badge">Left</span> : null}
              </span>
              <button
                type="button"
                className={cls}
                disabled={s.left}
                onClick={() => void onTap(s.roll, s.name, activeSlot.date, activeSlot.topic, s.left)}
              >
                ✓
              </button>
            </div>
          )
        })}
      </div>

      {roster.length > 0 && (
        <AzScrubber active={letter} present={presentLetters} onSelect={setLetter} />
      )}
      {letter && (
        <div className="az-filter-chip" role="status">
          <span>Letter {letter}</span>
          <button type="button" onClick={() => setLetter(null)}>
            Clear
          </button>
        </div>
      )}

      {/* Myntra FAB — list padding clears this */}
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
    </div>
  )
}

function SheetFrame({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="cl-sheet-layer" role="presentation">
      <button type="button" className="cl-sheet-scrim" aria-label="Close" onClick={onClose} />
      <div className="cl-sheet" role="dialog" aria-label={title}>
        <div className="cl-sheet-handle" aria-hidden />
        <div className="cl-sheet-head">
          <h3>{title}</h3>
          <button type="button" className="cl-sheet-x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="cl-sheet-body">{children}</div>
      </div>
    </div>
  )
}
