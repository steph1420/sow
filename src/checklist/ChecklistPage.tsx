import { useBackLayer } from '../nav/backStack'
import { createScrollTween, type ScrollTween } from './scrollTween'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { usePrefs } from '../prefs/PrefsContext'
import { CheckMark, DashMark } from '../components/CheckMark'
import { AzStrip } from './az/AzStrip'
import { SearchBar } from './chrome/SearchBar'
import { SelectBar } from './chrome/SelectBar'
import type { AzLetter } from './gestures/azLayout'
import {
  extendTarget,
  paintRoll,
  rollAtY,
  rollsBetween,
  shouldEngagePaint,
  rowSwipeValue,
  startPaintSession,
  type DateCol,
  type PaintSession,
} from './gestures/paintPhysics'
import {
  applyRollDrag,
  createSelectModel,
  enterSelect,
  exitSelect,
  SELECT_HOLD_MS,
  toggleRoll,
  type SelectModel,
} from './gestures/selectPhysics'
import { normalizeSwipeStyle, pendingRowClass, washPercent } from './gestures/swipeConfirm'
import { crossedColumns, nameArmed, normalizeNameSwipe } from './gestures/nameSwipe'
import { useChecklistModel } from './state/useChecklistModel'
import { useShare } from '../share/ShareContext'
import { haptic } from '../lib/haptics'
import './checklist.css'

type RowGeom = { roll: number; top: number; bottom: number }

type Props = {
  /** Class tap → Overview portal (Portal IA). */
  onGoOverview?: () => void
}

/**
 * Portal IA Checklist — lean panel (class · topic · set-count).
 * Mode / Pending / Copy live in Tools sheet. Wave A gestures unchanged.
 */
export function ChecklistPage(_props: Props) {
  const m = useChecklistModel()
  const { openShare } = useShare()
  const { prefs } = usePrefs()
  const showFab = prefs['chrome.showFab']
  const azLeft = prefs['az.leftSide']
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef(new Map<number, HTMLDivElement>())
  const [select, setSelect] = useState<SelectModel>(() => createSelectModel())
  const [glowRolls, setGlowRolls] = useState<Set<number>>(() => new Set())
  const [toolsOpen, setToolsOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [leanHidden, setLeanHidden] = useState(false)
  const [azFocusRoll, setAzFocusRoll] = useState<number | null>(null)
  const lastScrollY = useRef(0)
  // Overlays are back-steps (t156u): hardware back closes them before leaving Checklist.
  useBackLayer(m.searchOpen ? 1 : 0, () => m.setSearchOpen(false))
  useBackLayer(toolsOpen ? 1 : 0, () => setToolsOpen(false))
  useBackLayer(copyOpen ? 1 : 0, () => setCopyOpen(false))
  const reduceMotion = prefs['chrome.reduceMotion']
  const swipeStyle = normalizeSwipeStyle(prefs['gestures.swipeConfirmStyle'])
  const [glowValue, setGlowValue] = useState(true)
  /** v0.31.0: visible column indexes the cue targets (null = all visible, the ✓-cell swipe). */
  const [glowCols, setGlowCols] = useState<number[] | null>(null)
  const nameSwipeFrom = normalizeNameSwipe(prefs['gestures.nameSwipeFrom'])

  const paintRef = useRef<{
    session: PaintSession | null
    startX: number
    startY: number
    startRoll: number
    startCol: DateCol
    engaged: boolean
    pointerId: number | null
    startValue: boolean
    startDate: string
    /** t170u: multi-row extension armed (hesitancy passed) */
    armed: boolean
    /** v0.31.0 (t5u): swipe started on the name row → only crossed boxes respond */
    fromName?: boolean
    crossed?: Set<number>
    lastX?: number
    cols?: { left: number; right: number }[]
  } | null>(null)

  const nameHoldRef = useRef<{
    roll: number
    startX: number
    startY: number
    timer: number
    pointerId: number
  } | null>(null)

  const rollDragRef = useRef<{
    active: boolean
    pointerId: number
  } | null>(null)

  const orderedRolls = useMemo(
    () => m.filteredRoster.map((r) => r.roll),
    [m.filteredRoster],
  )

  const echoDate = m.visibleDates[0] ?? m.dates[m.activeDateIndex]
  const echoProg = m.progressFor(echoDate.date)

  const measureRows = useCallback((): RowGeom[] => {
    const out: RowGeom[] = []
    for (const roll of orderedRolls) {
      const el = rowRefs.current.get(roll)
      if (!el) continue
      const r = el.getBoundingClientRect()
      out.push({ roll, top: r.top, bottom: r.bottom })
    }
    return out
  }, [orderedRolls])

  const tweenRef = useRef<ScrollTween | null>(null)
  const scrubbingRef = useRef(false)
  useEffect(() => () => tweenRef.current?.cancel(), [])

  /** Mid-snap to ~50% viewport; clamp(0,max) = near-top exception (no empty gap). */
  const scrollToRoll = useCallback(
    (roll: number, urgent = true) => {
      const el = rowRefs.current.get(roll)
      const wrap = listRef.current
      if (!el || !wrap) return
      const er = el.getBoundingClientRect()
      const wr = wrap.getBoundingClientRect()
      const mid = wr.top + wr.height * 0.5
      const delta = er.top + er.height / 2 - mid
      const maxScroll = Math.max(0, wrap.scrollHeight - wrap.clientHeight)
      const target = Math.max(0, Math.min(wrap.scrollTop + delta, maxScroll))
      if (!urgent || reduceMotion) {
        tweenRef.current?.cancel()
        wrap.scrollTop = target
      } else {
        if (!tweenRef.current) tweenRef.current = createScrollTween(wrap)
        scrubbingRef.current = true
        tweenRef.current.to(target)
      }
    },
    [reduceMotion],
  )

  const onAzJump = useCallback(
    (_letter: AzLetter, roll: number | null) => {
      if (roll == null) {
        setAzFocusRoll(null)
        return
      }
      setAzFocusRoll(roll)
      scrollToRoll(roll, true)
    },
    [scrollToRoll],
  )

  const onAzScrubEnd = useCallback(() => {
    window.setTimeout(() => {
      scrubbingRef.current = false
      if (listRef.current) lastScrollY.current = listRef.current.scrollTop
    }, 220)
    window.setTimeout(() => setAzFocusRoll(null), 700)
  }, [])

  const onListScroll = useCallback(() => {
    const wrap = listRef.current
    if (!wrap) return
    const y = wrap.scrollTop
    if (scrubbingRef.current) {
      lastScrollY.current = y
      return
    }
    const dy = y - lastScrollY.current
    if (Math.abs(dy) < 10) {
      lastScrollY.current = y
      return
    }
    // Browser toolbar: hide on scroll-down (scrollTop↑), show on scroll-up
    if (dy > 0 && y > 24) setLeanHidden(true)
    else if (dy < 0) setLeanHidden(false)
    lastScrollY.current = y
  }, [])

  const onCheckPointerDown = (
    e: ReactPointerEvent,
    roll: number,
    colIndex: number,
    date: string,
  ) => {
    if (select.active) return
    e.preventDefault()
    const logicalCol: DateCol = m.showTwoCol
      ? (colIndex as DateCol)
      : m.activeDateIndex
    const value = m.isOn(roll, date)
    paintRef.current = {
      session: null,
      startX: e.clientX,
      startY: e.clientY,
      startRoll: roll,
      startCol: logicalCol,
      engaged: false,
      pointerId: e.pointerId,
      startValue: value,
      startDate: date,
      armed: false,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onCheckPointerMove = (e: ReactPointerEvent) => {
    const st = paintRef.current
    if (!st || st.pointerId !== e.pointerId) return
    const dx = e.clientX - st.startX
    const dy = e.clientY - st.startY

    if (!st.engaged) {
      if (!shouldEngagePaint({ dx, dy })) return
      st.engaged = true
      if (st.fromName) clearNameHold()
      else {
        // t165u: swipe value = toggle of the start row across all visible dates
        const value = rowSwipeValue(m.visibleDates.map((d) => m.isOn(st.startRoll, d.date)))
        st.session = startPaintSession(st.startCol, value, st.startRoll)
        if (!m.showTwoCol) st.session.targetCol = st.startCol
        haptic('selection')
        setGlowValue(value)
        setGlowCols(null)
        setGlowRolls(new Set([st.startRoll]))
      }
    }

    // v0.31.0 (t5u): from the name row, boxes respond only once the finger crosses them.
    if (st.fromName) {
      const hit = crossedColumns(st.lastX ?? st.startX, e.clientX, st.cols ?? [])
      st.lastX = e.clientX
      const before = st.crossed!.size
      for (const i of hit) st.crossed!.add(i)
      if (!st.crossed!.size) return
      if (!st.session) {
        // same rule as the ✓-cell swipe (t165u): any unticked box in the row → tick, else clear
        const value = rowSwipeValue(m.visibleDates.map((d) => m.isOn(st.startRoll, d.date)))
        st.session = startPaintSession(st.startCol, value, st.startRoll)
        haptic('selection')
        setGlowValue(value)
        setGlowRolls(new Set([st.startRoll]))
      } else if (st.crossed!.size !== before) haptic('selection')
      if (st.crossed!.size !== before) setGlowCols([...st.crossed!].sort())
    }

    if (!st.session) return
    if (swipeStyle === 'wash') {
      for (const roll of st.session.paintedRolls) {
        const el = rowRefs.current.get(roll)
        if (!el) continue
        const r = el.getBoundingClientRect()
        el.style.setProperty('--wash-x', `${washPercent(e.clientX, r.left, r.width)}%`)
      }
    }
    // t167u dev option: a swipe commits only the row it started on (ignores vertical drift)
    if (prefs['gestures.swipeSingleRow']) return
    // t170u: hesitant — must travel well into the next row before extending
    const t = extendTarget(e.clientY, measureRows(), st.startRoll, st.armed)
    st.armed = t.armed
    if (t.roll == null) return
    let added = false
    for (const roll of rollsBetween(orderedRolls, st.startRoll, t.roll)) added = paintRoll(st.session, roll) || added
    if (added) {
      haptic('selection')
      setGlowRolls(new Set(st.session.paintedRolls))
    }
  }

  const finishPaint = (e: ReactPointerEvent, didTap: boolean) => {
    const st = paintRef.current
    paintRef.current = null
    if (st?.session) for (const roll of st.session.paintedRolls) rowRefs.current.get(roll)?.style.removeProperty('--wash-x')
    if (!st || st.pointerId !== e.pointerId) return

    if (st.engaged && st.session) {
      // t165u: commit every covered row × every visible date in one undo step
      const rolls = [...st.session.paintedRolls]
      const value = st.session.paintValue
      const dates = st.fromName ? m.visibleDates.filter((_, i) => st.crossed!.has(i)) : m.visibleDates
      m.setCellsValue(
        rolls.flatMap((roll) => dates.map((d) => ({ roll, date: d.date }))),
        value,
      )
      haptic('medium')
      setGlowRolls(new Set()) // t168u: pending blue clears instantly on release
      return
    }
    setGlowRolls((g) => (g.size ? new Set() : g))
    if (st.fromName) return // a name touch never toggles a box by itself

    if (didTap) {
      haptic('light')
      m.toggleCell(st.startRoll, st.startDate)
    }
  }

  const onCheckPointerUp = (e: ReactPointerEvent) => {
    const st = paintRef.current
    const moved =
      st != null
        ? Math.hypot(e.clientX - st.startX, e.clientY - st.startY)
        : 0
    finishPaint(e, moved < 8 && !(st?.engaged))
  }

  const clearNameHold = () => {
    const h = nameHoldRef.current
    if (h) window.clearTimeout(h.timer)
    nameHoldRef.current = null
  }

  const onNamePointerDown = (e: ReactPointerEvent, roll: number) => {
    if (select.active) {
      setSelect((s) => toggleRoll(s, roll))
      return
    }
    const pointerId = e.pointerId
    const startX = e.clientX
    const startY = e.clientY
    const timer = window.setTimeout(() => {
      const h = nameHoldRef.current
      if (!h || h.pointerId !== pointerId) return
      setSelect(enterSelect(createSelectModel(), roll))
      haptic('heavy')
      nameHoldRef.current = null
    }, SELECT_HOLD_MS)
    nameHoldRef.current = { roll, startX, startY, timer, pointerId }
    // v0.31.0 (t5u): right part of the name row arms a swipe (no preventDefault → native scroll + long-press stay)
    const nr = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (nameArmed(e.clientX, nr.left, nr.width, nameSwipeFrom)) {
      const row = rowRefs.current.get(roll)
      const cols = row ? [...row.querySelectorAll('.sw-check-hit')].map((c) => { const r = c.getBoundingClientRect(); return { left: r.left, right: r.right } }) : []
      paintRef.current = {
        session: null, startX, startY, startRoll: roll, startCol: m.activeDateIndex, engaged: false, pointerId,
        startValue: false, startDate: '', armed: false, fromName: true, crossed: new Set(), lastX: startX, cols,
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture(pointerId)
    }
  }

  const onNamePointerMove = (e: ReactPointerEvent) => {
    const h = nameHoldRef.current
    if (!h || h.pointerId !== e.pointerId) return
    const move = Math.hypot(e.clientX - h.startX, e.clientY - h.startY)
    if (move > 10) clearNameHold()
  }

  const onNamePointerUp = (e: ReactPointerEvent) => {
    const h = nameHoldRef.current
    if (!h || h.pointerId !== e.pointerId) return
    clearNameHold()
  }

  const onRollPointerDown = (e: ReactPointerEvent, roll: number) => {
    if (!select.active) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    rollDragRef.current = { active: true, pointerId: e.pointerId }
    setSelect((s) => ({ ...s, dragAnchor: roll, selected: new Set([...s.selected, roll]) }))
  }

  const onRollPointerMove = (e: ReactPointerEvent) => {
    const rd = rollDragRef.current
    if (!rd?.active || rd.pointerId !== e.pointerId) return
    const roll = rollAtY(e.clientY, measureRows())
    if (roll == null) return
    setSelect((s) => {
      const n = applyRollDrag(s, orderedRolls, roll)
      if (n.selected.size !== s.selected.size) haptic('selection')
      return n
    })
  }

  const onRollPointerUp = (e: ReactPointerEvent) => {
    if (rollDragRef.current?.pointerId === e.pointerId) rollDragRef.current = null
  }

  const selectedRolls = [...select.selected]
  const onSelectMark = () => {
    if (!selectedRolls.length) return
    const targets = selectedRolls.flatMap((roll) =>
      m.visibleDates.map((d) => ({ roll, date: d.date })),
    )
    m.setCellsValue(targets, true)
    haptic('medium')
  }
  const onSelectClear = () => {
    if (!selectedRolls.length) return
    const targets = selectedRolls.flatMap((roll) =>
      m.visibleDates.map((d) => ({ roll, date: d.date })),
    )
    m.setCellsValue(targets, false)
    haptic('medium')
  }

  const copyDate = (from: 0 | 1, to: 0 | 1) => {
    m.copyField(m.dates[from]!.date, m.dates[to]!.date)
    haptic('medium')
    setCopyOpen(false)
    setToolsOpen(false)
  }

  const tickAll = (date: string, value: boolean) => {
    m.setCellsValue(
      m.filteredRoster.map((r) => ({ roll: r.roll, date })),
      value,
    )
    haptic('success')
  }

  const allState = (date: string): 'on' | 'off' | 'partial' => {
    const rows = m.filteredRoster
    if (!rows.length) return 'off'
    let on = 0
    for (const r of rows) if (m.isOn(r.roll, date)) on++
    if (on === 0) return 'off'
    if (on === rows.length) return 'on'
    return 'partial'
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelect(exitSelect())
        setCopyOpen(false)
        setToolsOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className={`sw-page${m.mode === 'submitted' ? ' mode-sub' : ''}${reduceMotion ? ' reduce-motion' : ''}`}
    >
      {select.active ? (
        <SelectBar
          count={select.selected.size}
          onMark={onSelectMark}
          onClear={onSelectClear}
          onDone={() => setSelect(exitSelect())}
        />
      ) : null}

      <div className="sw-chrome" data-testid="sw-chrome">
      <div className="sw-lean">
        <div className={`sw-lean-main${leanHidden ? ' is-hidden' : ''}`}>
          {/* P2-3: title is read-only (was a full-width "Back to Overview" button); Back/tab bar navigate */}
          <div className="sw-lean-left">
            <div className="sw-lean-class">{m.classLabel}</div>
            <div className="sw-lean-topic">
              {echoDate.topic}{' '}
              <span className="d">
                ·{' '}
                {m.showTwoCol
                  ? `${m.dates[0].dayNum} · ${m.dates[1].dayNum}`
                  : (m.visibleDates[0] ?? echoDate).dayNum}
              </span>
            </div>
          </div>
          <div className={`sw-lean-count${m.mode === 'submitted' ? ' mode-sub' : ''}`}>
            <div className="n">
              {echoProg.n}/{echoProg.total}
            </div>
            <div className="u">{m.mode === 'set' ? 'set' : 'submitted'}</div>
          </div>
        </div>

        <div className="sw-lean-tools">
          <button
            type="button"
            className={`sw-chip date-pill${m.pills[0] ? ' on' : ''}`}
            onClick={() => m.togglePill(0)}
          >
            {m.dates[0].dayNum}
          </button>
          <button
            type="button"
            className={`sw-chip date-pill${m.pills[1] ? ' on' : ''}`}
            onClick={() => m.togglePill(1)}
          >
            {m.dates[1].dayNum}
          </button>
          <button type="button" className="sw-icon-btn" disabled={!m.canUndo} onClick={() => { m.undo(); haptic('light') }}>
            ↶
          </button>
          <button type="button" className="sw-icon-btn" disabled={!m.canRedo} onClick={() => { m.redo(); haptic('light') }}>
            ↷
          </button>
          <span className="sw-lean-spacer" />
          <button
            type="button"
            className={`sw-chip sw-tools-chip${toolsOpen ? ' on' : ''}`}
            onClick={() => setToolsOpen(true)}
          >
            Tools ▾
          </button>
          <button
            type="button"
            className={`sw-search-btn${m.searchOpen ? ' on' : ''}`}
            aria-label="Search"
            onClick={() => m.setSearchOpen((v) => !v)}
          >
            ⌕
          </button>
        </div>

        {m.searchOpen ? (
          <SearchBar
            value={m.query}
            onChange={m.setQuery}
            onClose={() => {
              m.setSearchOpen(false)
              m.setQuery('')
            }}
          />
        ) : null}
      </div>

        <div className={`sw-colhead-bar${azLeft ? ' az-left' : ''}`}>
            <div className={`sw-colhead ${m.showTwoCol ? 'two' : 'one'}`}>
              <span>#</span>
              <span>Name</span>
              {m.visibleDates.map((d) => {
                const st = allState(d.date)
                return (
                  <span className="tick" key={d.date}>
                    <button
                      type="button"
                      className={`sw-allbox${st === 'on' ? ' on' : st === 'partial' ? ' partial' : ''}`}
                      role="checkbox"
                      aria-checked={st === 'on' ? 'true' : st === 'partial' ? 'mixed' : 'false'}
                      aria-label={`${st === 'on' ? 'All ticked' : st === 'partial' ? 'Some ticked' : 'None ticked'} ${d.dayLabel} · tap to ${st === 'on' ? 'untick' : 'tick'} all`}
                      data-state={st}
                      onClick={() => tickAll(d.date, st !== 'on')}
                    >
                      {st === 'on' ? <CheckMark size={12} /> : st === 'partial' ? <DashMark size={12} /> : null}
                    </button>
                  </span>
                )
              })}
            </div>
        </div>
      </div>

      <div className="sw-body">
        <div
          className={`sw-list-wrap${azLeft ? ' az-left' : ''}`}
          ref={listRef}
          onScroll={onListScroll}
        >
          <div className={`sw-rows${select.active ? ' selecting' : ''}`}>
            {m.filteredRoster.map((r) => {
              const selected = select.selected.has(r.roll)
              const glow = glowRolls.has(r.roll)
              return (
                <div
                  key={r.roll}
                  className={`sw-row ${m.showTwoCol ? 'two' : 'one'}${selected ? ' sel' : ''}${glow ? pendingRowClass(swipeStyle, glowRolls.size, glowValue) : ''}${azFocusRoll === r.roll ? ' az-focus' : ''}`}
                  ref={(el) => {
                    if (el) rowRefs.current.set(r.roll, el)
                    else rowRefs.current.delete(r.roll)
                  }}
                  data-roll={r.roll}
                >
                  <div
                    className="sw-roll"
                    onPointerDown={(e) => onRollPointerDown(e, r.roll)}
                    onPointerMove={onRollPointerMove}
                    onPointerUp={onRollPointerUp}
                  >
                    {r.roll}
                  </div>
                  <div
                    className="sw-name"
                    onPointerDown={(e) => onNamePointerDown(e, r.roll)}
                    onPointerMove={(e) => { onNamePointerMove(e); onCheckPointerMove(e) }}
                    onPointerUp={(e) => { onNamePointerUp(e); onCheckPointerUp(e) }}
                    onPointerCancel={(e) => { clearNameHold(); finishPaint(e, false) }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {r.name}
                  </div>
                  {m.visibleDates.map((d, colIndex) => {
                    const on = m.isOn(r.roll, d.date)
                    const tgt = glow && (glowCols == null || glowCols.includes(colIndex))
                    return (
                      <div
                        key={d.date}
                        className="sw-check-hit"
                        onPointerDown={(e) => onCheckPointerDown(e, r.roll, colIndex, d.date)}
                        onPointerMove={onCheckPointerMove}
                        onPointerUp={onCheckPointerUp}
                        onPointerCancel={(e) => finishPaint(e, false)}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <div className={`sw-check${on ? ' on' : ''}${tgt ? ' tgt' : ''}${tgt && swipeStyle === 'blue' ? ' pending' : ''}`}>
                          {on ? <CheckMark size={12} /> : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        <AzStrip
          names={m.filteredRoster.map((r) => r.name)}
          rows={m.filteredRoster}
          onJump={onAzJump}
          onScrubEnd={onAzScrubEnd}
          modeSub={m.mode === 'submitted'}
        />
        {showFab ? (
          <div className={`sw-fab${azLeft ? ' az-left' : ''}`}>
            <button type="button" onClick={() => m.setPendingOnly((v) => !v)}>
              Filters
            </button>
            <button type="button" onClick={() => { /* sort stub */ }}>
              Sort
            </button>
          </div>
        ) : null}
      </div>

      {toolsOpen ? (
        <>
          <button
            type="button"
            className="sw-copy-scrim"
            aria-label="Dismiss Tools"
            onClick={() => setToolsOpen(false)}
          />
          <div className="sw-tools-sheet" role="dialog" aria-label="Tools">
            <div className="sw-tools-lbl">Mode</div>
            <div className="sw-modebar">
              <button
                type="button"
                className={m.mode === 'set' ? 'on' : ''}
                onClick={() => { if (m.mode !== 'set') haptic('medium'); m.setMode('set') }}
              >
                Set
              </button>
              <button
                type="button"
                className={m.mode === 'submitted' ? 'on' : ''}
                onClick={() => { if (m.mode !== 'submitted') haptic('medium'); m.setMode('submitted') }}
              >
                Submitted
              </button>
            </div>
            <button
              type="button"
              className={`sw-tools-row${m.pendingOnly ? ' on' : ''}`}
              onClick={() => m.setPendingOnly((v) => !v)}
            >
              <span className="dot">●</span> Pending only
              <span className="chev">{m.pendingOnly ? 'On' : 'Off'}</span>
            </button>
            {m.dates.length === 2 ? (
              <button
                type="button"
                className="sw-tools-row"
                onClick={() => {
                  setToolsOpen(false)
                  setCopyOpen(true)
                }}
              >
                ⎘ Copy marks…
                <span className="chev">›</span>
              </button>
            ) : null}
            {/* v0.28 (mock share-mj2): one-word Share — current class + shown date */}
            <button
              type="button"
              className="sw-tools-row share"
              onClick={() => {
                setToolsOpen(false)
                openShare({ classKey: m.classKey, date: echoDate, dates: m.showTwoCol ? m.visibleDates : undefined })
              }}
            >
              Share
              <span className="chev">›</span>
            </button>
            <button type="button" className="sw-tools-row mute" onClick={() => setToolsOpen(false)}>
              Done
            </button>
          </div>
        </>
      ) : null}

      {copyOpen ? (
        <>
          <button type="button" className="sw-copy-scrim" aria-label="Dismiss" onClick={() => setCopyOpen(false)} />
          <div className="sw-copy-sheet" role="dialog" aria-label="Copy marks">
            <button type="button" onClick={() => copyDate(0, 1)}>
              Copy {m.dates[0].dayLabel} → {m.dates[1].dayLabel}
            </button>
            <button type="button" onClick={() => copyDate(1, 0)}>
              Copy {m.dates[1].dayLabel} → {m.dates[0].dayLabel}
            </button>
            <button type="button" onClick={() => setCopyOpen(false)}>
              Cancel
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
