/**
 * Ingenuity bar (Steve t123u → psychology, not flash):
 * Wow = inevitable cleverness in the hand — Tesla/Dragon craft, not neon.
 * 1) Gesture physics as craft (Phase 2): hold-paint stroke, roll-drag select, forgiving hits / calm visuals.
 * 2) A–Z anti-squish + fisheye (Phase 3): absolute % slots, idle 42, letter ≥11px — precision on 21:9.
 * 3) Search glued to visibleViewport (Phase 4): pin + Autofill-safe — keyboard never fights the filter.
 * 4) Progressive power: FAB off by default; Wave A when needed; roster hero; chrome earns pixels.
 * 5) One accent job: soft green ✓ = done; Quiet type density = expensive restraint.
 * Perceived agency (t126u): defaults choose; teacher controls marking in the hand — never empty toggles.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CLASS_KEYS,
  listMarks,
  putMark,
  putSession,
  setAllMarks,
  toggleMarkField,
  type ClassKey,
  type Mark,
} from '../../db'
import CalendarSheet from '../../components/CalendarSheet'
import { presentLettersFromNames } from '../../lib/azScrubber'
import { shortDateLabel } from '../../lib/shortDate'
import {
  canRedo,
  canUndo,
  popRedo,
  popUndo,
  pushUndo,
  type MarkSnap,
} from '../../lib/undoStack'
import { loadPrefs, subscribePrefs, type UndoChrome } from '../../lib/sowPrefs'
import ChecklistChrome from './ChecklistChrome'
import CkAzStrip from './CkAzStrip'
import CkColHead from './CkColHead'
import CkFab from './CkFab'
import CkRosterList from './CkRosterList'
import { useChecklistFilters } from './hooks/useChecklistFilters'
import { useChecklistSession } from './hooks/useChecklistSession'
import { useHoldPaint } from './hooks/useHoldPaint'
import { useSelectMode } from './hooks/useSelectMode'
import { classTitle } from './lib/classTitle'
import { showTwoCol as computeTwoCol, singlePillSlot, toggleColPill } from './lib/colPills'
import SheetFrame from './sheets/SheetFrame'
import type { ChecklistSheet, DateInfo, DateSlot, Mode } from './types'
import './checklist.css'

function snapOf(m: Mark | undefined, roll: number, name: string, date: string, topic: string): MarkSnap {
  return { roll, name, date, topic, set: !!m?.set, submitted: !!m?.submitted }
}

export default function ChecklistPage() {
  const {
    classKey,
    selectClass,
    session,
    roster,
    markMap,
    hideLeft,
    activeDate,
    setActiveDate,
    colPills,
    setColPills,
    dates,
    reload,
  } = useChecklistSession()

  const [mode, setMode] = useState<Mode>('set')
  const [sheet, setSheet] = useState<ChecklistSheet>(null)
  const [jumpLetter, setJumpLetter] = useState<string | null>(null)
  const [latchRoll, setLatchRoll] = useState<number | null>(null)
  const [stackTick, setStackTick] = useState(0)
  const [prefs, setPrefs] = useState(() => loadPrefs())
  const [undoChrome, setUndoChrome] = useState<UndoChrome>(() => loadPrefs()['undo.chrome'])
  const headRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const select = useSelectMode(listRef)

  useEffect(
    () =>
      subscribePrefs((p) => {
        setPrefs(p)
        setUndoChrome(p['undo.chrome'])
      }),
    [],
  )

  useEffect(() => {
    document.documentElement.style.setProperty('--ck-az-idle-w', `${prefs['az.idleWidth']}px`)
    document.documentElement.dataset.azSide = prefs['az.leftSide'] ? 'left' : 'right'
  }, [prefs])

  const hasTwoDates = dates.length >= 2
  const d1 = dates.find((d) => d.slot === 'd1') ?? dates[0] ?? null
  const d2 = dates.find((d) => d.slot === 'd2') ?? (dates.length > 1 ? dates[1] : null)
  const showTwoCol = computeTwoCol(hasTwoDates, colPills)
  const oneSlot = singlePillSlot(hasTwoDates, colPills)

  const activeSlot = useMemo(() => {
    if (oneSlot) return dates.find((d) => d.slot === oneSlot) ?? dates[0] ?? null
    return dates.find((d) => d.date === activeDate) ?? dates[0] ?? null
  }, [dates, activeDate, oneSlot])

  const filters = useChecklistFilters(
    roster,
    hideLeft,
    markMap,
    activeSlot?.date ?? null,
    mode,
  )

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

  const presentLetters = useMemo(() => {
    const list = hideLeft ? roster.filter((s) => !s.left) : roster
    return presentLettersFromNames(list.map((s) => s.name))
  }, [roster, hideLeft])

  useLayoutEffect(() => {
    const head = headRef.current
    if (!head) return
    const main = head.closest('.main') as HTMLElement | null
    const apply = () => {
      const top = Math.max(0, Math.round(head.getBoundingClientRect().bottom + (main?.scrollTop ?? 0)))
      document.documentElement.style.setProperty('--ck-az-top', `${top}px`)
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
  }, [filters.rows.length, filters.searchOpen, sheet, mode, colPills, prefs, select.selectMode])

  useEffect(() => {
    if (!jumpLetter) {
      setLatchRoll(null)
      return
    }
    const list = listRef.current
    if (!list) return
    const row = list.querySelector(`[data-letter="${jumpLetter}"]`) as HTMLElement | null
    if (row) {
      row.scrollIntoView({ block: 'start', behavior: 'smooth' })
      const roll = Number(row.dataset.roll)
      if (Number.isFinite(roll)) setLatchRoll(roll)
    }
  }, [jumpLetter])

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

  async function onUndo() {
    const entry = popUndo(classKey)
    if (!entry) return
    await applySnaps(entry.undo)
    setStackTick((t) => t + 1)
  }
  async function onRedo() {
    const entry = popRedo(classKey)
    if (!entry) return
    await applySnaps(entry.redo)
    setStackTick((t) => t + 1)
  }

  const onTap = useCallback(
    async (roll: number, name: string, date: string, topic: string, left: boolean) => {
      if (left || select.selectMode) return
      const before = [snapOf(markMap.get(`${roll}|${date}`), roll, name, date, topic)]
      await toggleMarkField(classKey, roll, date, mode, name, topic)
      const afterMarks = await listMarks(classKey)
      const after = [
        snapOf(
          afterMarks.find((x) => x.roll === roll && x.date === date),
          roll,
          name,
          date,
          topic,
        ),
      ]
      pushUndo(classKey, { undo: before, redo: after })
      setStackTick((t) => t + 1)
      await reload()
    },
    [classKey, markMap, mode, reload, select.selectMode],
  )

  const paintEnabled = hasTwoDates && showTwoCol && !!session && !!d1 && !!d2

  const onPaintCommit = useCallback(
    async (c: { roll: number; name: string; from: DateSlot; to: DateSlot }) => {
      if (!session) return
      const fromDate = c.from === 'd1' ? session.date1 : session.date2
      const toDate = c.from === 'd1' ? session.date2 : session.date1
      const fromTopic = c.from === 'd1' ? session.topic1 : session.topic2
      const toTopic = c.from === 'd1' ? session.topic2 : session.topic1
      if (!fromDate || !toDate) return
      const before = [
        snapOf(markMap.get(`${c.roll}|${fromDate}`), c.roll, c.name, fromDate, fromTopic),
        snapOf(markMap.get(`${c.roll}|${toDate}`), c.roll, c.name, toDate, toTopic),
      ]
      const fromMark = markMap.get(`${c.roll}|${fromDate}`)
      const toExisting = markMap.get(`${c.roll}|${toDate}`)
      await putMark({
        classKey,
        roll: c.roll,
        name: c.name,
        date: fromDate,
        topic: fromTopic,
        set: mode === 'set' ? true : !!fromMark?.set,
        submitted: mode === 'submitted' ? true : !!fromMark?.submitted,
      })
      await putMark({
        classKey,
        roll: c.roll,
        name: c.name,
        date: toDate,
        topic: toTopic,
        set: mode === 'set' ? true : !!toExisting?.set,
        submitted: mode === 'submitted' ? true : !!toExisting?.submitted,
      })
      const afterMarks = await listMarks(classKey)
      const after = [
        snapOf(
          afterMarks.find((x) => x.roll === c.roll && x.date === fromDate),
          c.roll,
          c.name,
          fromDate,
          fromTopic,
        ),
        snapOf(
          afterMarks.find((x) => x.roll === c.roll && x.date === toDate),
          c.roll,
          c.name,
          toDate,
          toTopic,
        ),
      ]
      pushUndo(classKey, { undo: before, redo: after })
      setStackTick((t) => t + 1)
      await reload()
    },
    [classKey, markMap, mode, reload, session],
  )

  const onPaintTapSlot = useCallback(
    async (t: { roll: number; name: string; from: DateSlot }) => {
      if (!session) return
      const date = t.from === 'd1' ? session.date1 : session.date2
      const topic = t.from === 'd1' ? session.topic1 : session.topic2
      if (date) await onTap(t.roll, t.name, date, topic, false)
    },
    [onTap, session],
  )

  const paint = useHoldPaint({
    enabled: paintEnabled,
    selectMode: select.selectMode,
    onPaint: onPaintCommit,
    onTapSlot: onPaintTapSlot,
  })

  async function onCheckAll(date: string, topic: string) {
    const visible = filters.rows.filter((s) => !s.left)
    if (!visible.length) return
    const allOn = visible.every((s) => {
      const m = markMap.get(`${s.roll}|${date}`)
      return mode === 'set' ? !!m?.set : !!m?.submitted
    })
    const before = visible.map((s) =>
      snapOf(markMap.get(`${s.roll}|${date}`), s.roll, s.name, date, topic),
    )
    await setAllMarks(
      classKey,
      date,
      topic,
      mode,
      !allOn,
      visible.map((s) => ({ roll: s.roll, name: s.name, left: s.left })),
    )
    const afterMarks = await listMarks(classKey)
    const after = visible.map((s) =>
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
    await reload()
  }

  function allOnFor(date: string): boolean {
    const visible = filters.rows.filter((s) => !s.left)
    return (
      visible.length > 0 &&
      visible.every((s) => {
        const m = markMap.get(`${s.roll}|${date}`)
        return mode === 'set' ? !!m?.set : !!m?.submitted
      })
    )
  }

  function onDateCard(d: DateInfo) {
    if (!showTwoCol) {
      if (activeSlot?.date === d.date) {
        setSheet('cal')
      } else {
        setColPills(d.slot === 'd1' ? { d1: true, d2: false } : { d1: false, d2: true })
        setActiveDate(d.date)
      }
      return
    }
    setActiveDate(d.date)
    setSheet('cal')
  }

  async function confirmCalendar(next: string) {
    if (!session || !activeSlot) return
    const patch =
      activeSlot.slot === 'd1'
        ? { date1: next, topic1: session.topic1 }
        : { date2: next, topic2: session.topic2 }
    await putSession({ ...session, ...patch, updatedAt: new Date().toISOString() })
    setActiveDate(next)
    setSheet(null)
    await reload()
  }

  async function runBulkCopy(dir: '1to2' | '2to1') {
    if (!session || !hasTwoDates || select.selected.size === 0) return
    const fromDate = dir === '1to2' ? session.date1 : session.date2
    const toDate = dir === '1to2' ? session.date2 : session.date1
    const toTopic = dir === '1to2' ? session.topic2 : session.topic1
    const targets = filters.rows.filter((s) => select.selected.has(s.roll) && !s.left)
    const before: MarkSnap[] = []
    const after: MarkSnap[] = []
    for (const s of targets) {
      const src = markMap.get(`${s.roll}|${fromDate}`)
      const dst = markMap.get(`${s.roll}|${toDate}`)
      before.push(snapOf(dst, s.roll, s.name, toDate, toTopic))
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
      const updated = (await listMarks(classKey)).find((x) => x.roll === s.roll && x.date === toDate)
      after.push(snapOf(updated, s.roll, s.name, toDate, toTopic))
    }
    pushUndo(classKey, { undo: before, redo: after })
    setStackTick((t) => t + 1)
    setSheet(null)
    await reload()
  }

  async function runBulkClear(slot: DateSlot) {
    if (!session || select.selected.size === 0) return
    const date = slot === 'd1' ? session.date1 : session.date2
    const topic = slot === 'd1' ? session.topic1 : session.topic2
    if (!date) return
    const targets = filters.rows.filter((s) => select.selected.has(s.roll) && !s.left)
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

  function exitSelect() {
    select.exitSelect()
    setSheet(null)
  }

  const showFab = prefs['chrome.showFab']
  const filtersActive =
    filters.setFilter !== 'all' ||
    filters.subFilter !== 'all' ||
    filters.q.trim() !== '' ||
    hideLeft ||
    (hasTwoDates && !(colPills.d1 && colPills.d2))

  const countsLabel = hasTwoDates && session ? (
    <>
      <b>{countFor(session.date1)}</b> · <b>{countFor(session.date2)}</b> /{activeRoster.length} set
    </>
  ) : (
    <>
      <b>
        {activeSlot ? countFor(activeSlot.date) : 0}/{activeRoster.length}
      </b>{' '}
      set
    </>
  )

  if (!session) {
    return (
      <div className="ck-page" data-undo-chrome={undoChrome} data-az-side={prefs['az.leftSide'] ? 'left' : 'right'}>
        <div className="ck-banner">Checklist rebuild · Phase 2 gestures — open via Dev useRebuild</div>
        <CkClassHeaderEmpty
          title={classTitle(classKey)}
          onOpenClass={() => setSheet('class')}
        />
        <div className="ck-empty">
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
                className={`ck-sheet-row${k === classKey ? ' is-on' : ''}`}
                onClick={() => {
                  selectClass(k)
                  setSheet(null)
                }}
              >
                {classTitle(k)}
              </button>
            ))}
          </SheetFrame>
        ) : null}
      </div>
    )
  }

  const cols =
    showTwoCol && d1 && d2
      ? [
          { date: d1.date, topic: d1.topic, slot: 'd1' as const },
          { date: d2.date, topic: d2.topic, slot: 'd2' as const },
        ]
      : activeSlot
        ? [{ date: activeSlot.date, topic: activeSlot.topic, slot: activeSlot.slot }]
        : []

  const actionsEnabled = select.selCount >= 1

  return (
    <div
      className={`ck-page${select.selectMode ? ' is-selecting' : ''}`}
      data-undo-chrome={undoChrome}
      data-az-side={prefs['az.leftSide'] ? 'left' : 'right'}
    >
      <div className="ck-banner">
        Rebuild Phase 2 · paint stroke · select/roll-drag · FAB {showFab ? 'on' : 'hidden'}
      </div>

      {select.selectMode ? (
        <div className="ck-sel-bar">
          <div>
            <div className="title">{select.selCount} selected</div>
            <div className="sub">Tap name · scroll · drag roll #</div>
          </div>
          <button type="button" className="ck-sel-exit" aria-label="Exit select" onClick={exitSelect}>
            ✕
          </button>
        </div>
      ) : (
        <ChecklistChrome
          classTitle={classTitle(classKey)}
          countsLabel={countsLabel}
          hasTwoDates={hasTwoDates}
          dates={dates}
          colPills={colPills}
          showTwoCol={showTwoCol}
          activeDate={activeDate}
          activeCount={activeRoster.length}
          countFor={countFor}
          dateSoloLabel={activeSlot ? shortDateLabel(activeSlot.date) : null}
          mode={mode}
          onMode={setMode}
          undoOk={undoOk}
          redoOk={redoOk}
          onUndo={() => void onUndo()}
          onRedo={() => void onRedo()}
          undoChrome={undoChrome}
          showPending={prefs['filter.showPending']}
          showSearch={prefs['filter.showSearch']}
          setFilter={filters.setFilter}
          onTogglePending={() =>
            filters.setSetFilter((c) => (c === 'pending' ? 'all' : 'pending'))
          }
          d1={d1}
          d2={d2}
          onTogglePill={(slot: DateSlot) => setColPills((prev) => toggleColPill(prev, slot))}
          onCopy={() => {
            select.enterSelect()
            setSheet('actions')
          }}
          searchOpen={filters.searchOpen}
          q={filters.q}
          onToggleSearch={() => filters.setSearchOpen((o) => !o)}
          onSearchChange={filters.setQ}
          onSearchClear={() => filters.setQ('')}
          onOpenClass={() => setSheet('class')}
          onOpenCal={() => setSheet('cal')}
          onDateCard={onDateCard}
          topicOneCol={d1?.topic ?? null}
        />
      )}

      {!select.selectMode ? (
        <div ref={headRef}>
          <CkColHead
            showTwoCol={showTwoCol && !!d1 && !!d2}
            allOn1={d1 ? allOnFor(d1.date) : false}
            allOn2={d2 ? allOnFor(d2.date) : false}
            modeSet={mode === 'set'}
            onCheckAll1={d1 ? () => void onCheckAll(d1.date, d1.topic) : undefined}
            onCheckAll2={d2 ? () => void onCheckAll(d2.date, d2.topic) : undefined}
            allOn={activeSlot ? allOnFor(activeSlot.date) : false}
            onCheckAll={
              activeSlot ? () => void onCheckAll(activeSlot.date, activeSlot.topic) : undefined
            }
          />
        </div>
      ) : (
        <div ref={headRef} />
      )}

      <CkRosterList
        rows={filters.rows}
        showTwoCol={showTwoCol && !!d1 && !!d2}
        cols={cols}
        mode={mode}
        markOn={(roll, date) => {
          const m = markMap.get(`${roll}|${date}`)
          return mode === 'set' ? !!m?.set : !!m?.submitted
        }}
        latchRoll={latchRoll}
        selectMode={select.selectMode}
        selected={select.selected}
        paintUi={paint.paintUi}
        onTap={onTap}
        listRef={listRef}
        onNameDown={select.nameDown}
        onNameMove={select.nameMove}
        onNameUp={select.nameUp}
        onRollDown={select.rollDown}
        onRollMove={select.rollMove}
        onRollUp={select.rollUp}
        onPaintDown={paint.paintDown}
        onPaintMove={paint.paintMove}
        onPaintUp={paint.paintUp}
      />

      <CkAzStrip
        active={jumpLetter}
        present={presentLetters}
        fabVisible={showFab || select.selectMode}
        onJump={(letter) => setJumpLetter(letter)}
      />

      {select.selectMode ? (
        <button type="button" className="ck-ctx-fab" onClick={() => setSheet('actions')}>
          Actions ▾ · {select.selCount}
        </button>
      ) : showFab ? (
        <CkFab
          showSort={prefs['filter.showSort']}
          filtersActive={filtersActive}
          onSort={() => setSheet('sort')}
          onFilters={() => setSheet('filters')}
        />
      ) : null}

      {sheet === 'class' ? (
        <SheetFrame title="Class" onClose={() => setSheet(null)}>
          {CLASS_KEYS.map((k: ClassKey) => (
            <button
              key={k}
              type="button"
              className={`ck-sheet-row${k === classKey ? ' is-on' : ''}`}
              onClick={() => {
                selectClass(k)
                setSheet(null)
              }}
            >
              {classTitle(k)}
            </button>
          ))}
        </SheetFrame>
      ) : null}

      {sheet === 'cal' && activeSlot ? (
        <CalendarSheet
          appliedDate={activeSlot.date}
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
              className={`ck-sheet-row${filters.sortMode === id ? ' is-on' : ''}`}
              onClick={() => {
                filters.setSortMode(id)
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
            className={`ck-sheet-row${filters.setFilter === 'pending' ? ' is-on' : ''}`}
            onClick={() => {
              filters.setSetFilter((c) => (c === 'pending' ? 'all' : 'pending'))
              setSheet(null)
            }}
          >
            Pending only
          </button>
          <button
            type="button"
            className={`ck-sheet-row${filters.setFilter === 'finished' ? ' is-on' : ''}`}
            onClick={() => {
              filters.setSetFilter((c) => (c === 'finished' ? 'all' : 'finished'))
              setSheet(null)
            }}
          >
            Finished only
          </button>
          <button
            type="button"
            className="ck-sheet-row"
            onClick={() => {
              filters.setSetFilter('all')
              filters.setSubFilter('all')
              filters.setQ('')
              setColPills({ d1: true, d2: true })
              setSheet(null)
            }}
          >
            Clear filters
          </button>
        </SheetFrame>
      ) : null}

      {sheet === 'actions' && hasTwoDates && d1 && d2 ? (
        <SheetFrame
          title={`Actions · ${select.selCount} selected`}
          onClose={() => setSheet(null)}
          dismissOnScrim={false}
          hint={
            actionsEnabled
              ? 'Stays open — tap outside does nothing · ✕ to dismiss'
              : '0 selected = none · hold a name ~800ms to select first'
          }
        >
          <button
            type="button"
            className="ck-sheet-row"
            disabled={!actionsEnabled}
            onClick={() => void runBulkCopy('1to2')}
          >
            Copy {shortDateLabel(d1.date)} → {shortDateLabel(d2.date)}
            <span className="ck-sheet-meta">date1 → date2</span>
          </button>
          <button
            type="button"
            className="ck-sheet-row"
            disabled={!actionsEnabled}
            onClick={() => void runBulkCopy('2to1')}
          >
            Copy {shortDateLabel(d2.date)} → {shortDateLabel(d1.date)}
            <span className="ck-sheet-meta">date2 → date1</span>
          </button>
          <button
            type="button"
            className="ck-sheet-row is-danger"
            disabled={!actionsEnabled}
            onClick={() => void runBulkClear('d1')}
          >
            Clear {shortDateLabel(d1.date)}
            <span className="ck-sheet-meta">date1</span>
          </button>
          <button
            type="button"
            className="ck-sheet-row is-danger"
            disabled={!actionsEnabled}
            onClick={() => void runBulkClear('d2')}
          >
            Clear {shortDateLabel(d2.date)}
            <span className="ck-sheet-meta">date2</span>
          </button>
        </SheetFrame>
      ) : sheet === 'actions' ? (
        <SheetFrame title="Copy / clear" onClose={() => setSheet(null)}>
          <div className="ck-empty" style={{ padding: '12px 16px' }}>
            Need two dates in session for copy/clear. Add date2 in Session first.
          </div>
          <button type="button" className="ck-sheet-row" onClick={() => setSheet(null)}>
            Close
          </button>
        </SheetFrame>
      ) : null}
    </div>
  )
}

function CkClassHeaderEmpty({ title, onOpenClass }: { title: string; onOpenClass: () => void }) {
  return (
    <div className="ck-class-head">
      <div className="ck-class">
        <span className="ck-lbl">Class</span>
        <button type="button" className="ck-value" onClick={onOpenClass}>
          {title} <span className="caret">▾</span>
        </button>
      </div>
    </div>
  )
}
