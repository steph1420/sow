import { useBackLayer } from '../nav/backStack'
import { createScrollTween, type ScrollTween } from './scrollTween'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { usePrefs } from '../prefs/PrefsContext'
import { CheckMark } from '../components/CheckMark'
import { AzStrip, type AzStripHandle } from './az/AzStrip'
import { gridMove, isMod, isTypingTarget } from '../lib/keyboard'
import { SearchBar } from './chrome/SearchBar'
import { QuickSearchHud } from './chrome/QuickSearchHud'
import { QuickOverviewSheet } from './chrome/QuickOverviewSheet'
import { DatePopover, dm } from './chrome/DatePopover'
import { DateEditModal } from './chrome/DateEditModal'
import { countMarks } from '../dates/sessionEdit'
import { retarget, type Pair } from './pickDate'
import { describeUndo } from '../lib/undoLabel'
import { dateSlotFromIso } from '../demo/workspaceData'
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
import { useWorkspace } from '../demo/WorkspaceContext'
import { useShare } from '../share/ShareContext'
import { haptic } from '../lib/haptics'
import './checklist.css'
import { ChannelBadge } from '../components/ChannelBadge'

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
  const { openShare, toast } = useShare()
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

  // t82u calendar order: the newest visible date is last; header topic + share default use it.
  const echoDate = m.visibleDates[m.visibleDates.length - 1] ?? m.dates[m.activeDateIndex]

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

  // ── v0.37.0 keyboard (docs/KEYBOARD_WIDESCREEN_PLAN.md) ─────────────────
  const azRef = useRef<AzStripHandle>(null)
  const [kb, setKb] = useState<[number, number]>([0, 0])
  const [live, setLive] = useState('')
  const { setPupilLeft, activeClassKey, rosterFor, pickDate, closePast, sessionDatesFor, addSession, moveSession, deleteSession, restoreSession, marksByClass } = useWorkspace()
  // ── v0.43.0 Beta: tap a date header → popover; Edit/Add → centred popup (t18u–t34u LOCKED) ──
  const [popCol, setPopCol] = useState<number | null>(null)
  const [dem, setDem] = useState<{ mode: 'add' | 'edit'; from?: string } | null>(null)
  useBackLayer(popCol != null || dem ? 1 : 0, () => { setPopCol(null); setDem(null) })
  const slotOf = (ci: number): 0 | 1 => (m.showTwoCol ? (ci === 0 ? 0 : 1) : m.activeDateIndex)
  const popSlot = useRef<0 | 1>(1)
  const popTop = useRef(150)
  /** v0.44.0: the dates chip and the column headers both open the one date popover (old Dates sheet retired). */
  const openPopAt = (el: Element | null, slot: 0 | 1) => {
    const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wide-scale')) || 1
    const r = el?.getBoundingClientRect(); popTop.current = r ? (r.bottom + 6) / z : 150
    popSlot.current = slot; setPopCol(slot)
  }
  const showIso = (iso: string, slot: 0 | 1) => {
    const pair: Pair = [m.dates[0].date, m.dates[1].date]
    const next = retarget(pair, slot, iso)
    pickDate(activeClassKey, next)
    if (!m.showTwoCol) m.setPills(next[0] === next[1] || iso === next[0] ? [true, false] : [false, true])
  }
  const todayIso = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()
  // v0.41.0 (t101u): Undo / Redo name what they did in a toast with the opposite action.
  const doUndo = (kind: 'undo' | 'redo') => {
    const e = kind === 'undo' ? m.undo() : m.redo()
    if (!e) return
    haptic('light')
    const roster = rosterFor(activeClassKey)
    const nameOf = (r: number) => roster.find((x) => x.roll === r)?.name ?? `Roll ${r}`
    const dn = (iso: string) => dateSlotFromIso(iso, '').dayNum
    const msg = describeUndo(e, kind, { name: nameOf, dayNum: dn, rosterSize: m.filteredRoster.length })
    setLive(msg)
    toast(msg, { action: kind === 'undo' ? { label: 'Redo', run: () => doUndoRef.current('redo') } : { label: 'Undo', run: () => doUndoRef.current('undo') } })
  }
  const doUndoRef = useRef(doUndo); doUndoRef.current = doUndo
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const menuPos = () => {
    const r = menuBtnRef.current?.getBoundingClientRect()
    const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wide-scale')) || 1
    return r ? { top: (r.bottom + 6) / z, right: Math.max(8, (window.innerWidth - r.right) / z) } : undefined
  }
  const closeMenu = (refocus = false) => { setToolsOpen(false); if (refocus) requestAnimationFrame(() => menuBtnRef.current?.focus()) }
  const [qoOpen, setQoOpen] = useState(false)
  useBackLayer(qoOpen ? 1 : 0, () => setQoOpen(false))
  useEffect(() => {
    const open = () => setQoOpen(true)
    window.addEventListener('sow:quick-overview', open)
    return () => window.removeEventListener('sow:quick-overview', open)
  }, [])
  const lastLeft = useRef<{ roll: number; name: string; ri: number } | null>(null)
  const autoAdvance = prefs['kbd.autoAdvance']
  const [qsOpen, setQsOpen] = useState(false)
  const [qsRoll, setQsRoll] = useState<number | null>(null)
  const [qsIdle, setQsIdle] = useState(false)
  const qsReturn = useRef<HTMLElement | null>(null)
  const [gridFocus, setGridFocus] = useState(false)
  const nRows = m.filteredRoster.length
  const nCols = m.visibleDates.length
  const kbRow = Math.min(kb[0], Math.max(0, nRows - 1))
  const kbCol = Math.min(kb[1], Math.max(0, nCols - 1))
  const focusCell = useCallback((ri: number, ci: number) => {
    setKb([ri, ci])
    tweenRef.current?.cancel() // dogfood t69u: a lingering A–Z/quick-find tween must not fight keyboard focus
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-cell="${ri}-${ci}"]`)
      el?.focus({ preventScroll: true })
      el?.scrollIntoView({ block: 'nearest', behavior: 'instant' as ScrollBehavior })
    })
  }, [])
  const focusRoll = useCallback((roll: number | null) => {
    const ri = roll == null ? kbRow : m.filteredRoster.findIndex((r) => r.roll === roll)
    focusCell(Math.max(0, ri), kbCol)
  }, [focusCell, kbCol, kbRow, m.filteredRoster])

  const onCellKey = (e: ReactKeyboardEvent, ri: number, ci: number, roll: number, date: string) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const name = m.filteredRoster[ri]?.name ?? ''
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        const value = !m.visibleDates.every((d) => m.isOn(roll, d.date))
        m.setCellsValue(m.visibleDates.map((d) => ({ roll, date: d.date })), value)
        setLive(`${name}: ${value ? 'ticked' : 'unticked'} ${m.visibleDates.length === 2 ? 'both dates' : ''}`)
      } else {
        const was = m.isOn(roll, date)
        m.toggleCell(roll, date)
        setLive(`${name}: ${was ? 'unticked' : 'ticked'} ${m.visibleDates[ci]?.dayLabel ?? ''}`)
      }
      lastLeft.current = null
      haptic('light')
      if (autoAdvance && ri < nRows - 1) focusCell(ri + 1, ci)
      return
    }
    if (e.key === 'l' || e.key === 'L') {
      e.preventDefault()
      lastLeft.current = { roll, name, ri }
      setPupilLeft(activeClassKey, roll, true)
      setLive(`${name} marked Left — ${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Z to undo`)
      focusCell(Math.max(0, Math.min(ri, nRows - 2)), ci)
      return
    }
    if ((e.key === '1' || e.key === '2') && nCols === 2 && !e.shiftKey) {
      e.preventDefault()
      const c = Number(e.key) - 1
      const d = m.visibleDates[c]!
      const was = m.isOn(roll, d.date)
      m.toggleCell(roll, d.date)
      setLive(`${name}: ${was ? 'unticked' : 'ticked'} ${d.dayLabel}`)
      lastLeft.current = null
      haptic('light')
      if (autoAdvance && ri < nRows - 1) focusCell(ri + 1, ci)
      return
    }
    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault()
      const d = m.visibleDates[ci]!
      const value = allState(d.date) !== 'on'
      tickAll(d.date, value)
      setLive(`${value ? 'Ticked' : 'Unticked'} all for ${d.dayLabel}`)
      return
    }
    if (e.key === 'd' || e.key === 'D') {
      e.preventDefault()
      openPopAt(document.querySelector('.sw-lean-dates'), m.showTwoCol ? 1 : m.activeDateIndex)
      return
    }
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault()
      const next = m.mode === 'set' ? 'submitted' : 'set'
      m.setMode(next)
      setLive(`${next === 'set' ? 'Set' : 'Submitted'} mode`)
      return
    }
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault()
      m.setPendingOnly((v) => { setLive(v ? 'Showing all pupils' : 'Pending only'); return !v })
      return
    }
    const mv = gridMove(e.key, ri, ci, nRows, nCols)
    if (!mv) return
    e.preventDefault()
    if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      const nextRoll = m.filteredRoster[mv[0]]?.roll
      setSelect((s) => {
        const base = s.active ? s : enterSelect(createSelectModel(), roll)
        const sel = new Set(base.selected)
        sel.add(roll)
        if (nextRoll != null) sel.add(nextRoll)
        setLive(`${sel.size} selected`)
        return { ...base, selected: sel }
      })
    }
    focusCell(mv[0], mv[1])
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const typing = isTypingTarget(e.target as HTMLElement)
      if (e.key === 'Escape') {
        if (select.active || copyOpen || toolsOpen) e.preventDefault()
        setSelect(exitSelect())
        setCopyOpen(false)
        if (toolsOpen) { closeMenu(true); return }
        if (m.searchOpen) {
          m.setSearchOpen(false)
          m.setQuery('')
          focusCell(kbRow, kbCol)
          e.preventDefault()
        }
        return
      }
      if (isMod(e) && !e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        m.setSearchOpen(true)
        requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.sw-search input')?.focus())
        return
      }
      if (typing) return
      if (isMod(e) && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (!e.shiftKey && lastLeft.current) {
          const l = lastLeft.current
          lastLeft.current = null
          setPupilLeft(activeClassKey, l.roll, false)
          setLive(`${l.name} back to Active`)
          focusCell(l.ri, kbCol)
          return
        }
        doUndoRef.current(e.shiftKey ? 'redo' : 'undo')
        return
      }
      if (isMod(e) && !e.altKey && !e.shiftKey && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault(); doUndoRef.current('redo'); return
      }
      if ((e.key === 'o' || e.key === 'O') && !e.ctrlKey && !e.metaKey && !e.altKey && !document.querySelector('[role="dialog"]')) {
        e.preventDefault()
        setQoOpen(true)
        return
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        qsReturn.current = document.activeElement as HTMLElement | null
        setQsOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeClassKey, copyOpen, focusCell, kbCol, kbRow, m, select.active, setPupilLeft, toolsOpen])

  return (
    <div
      className={`sw-page${m.mode === 'submitted' ? ' mode-sub' : ''}${reduceMotion ? ' reduce-motion' : ''}${m.past ? ' past' : ''}`}
    >
      {m.past ? <div className="past-wm" aria-hidden>PAST</div> : null}
      {select.active ? (
        <SelectBar
          count={select.selected.size}
          onMark={onSelectMark}
          onClear={onSelectClear}
          onDone={() => setSelect(exitSelect())}
        />
      ) : null}

      <div className={`sw-chrome${leanHidden ? ' stuck' : ''}`} data-testid="sw-chrome">
      {m.past ? (
        <div className="past-bar" role="status" data-testid="past-bar">
          <span className="past-t"><span aria-hidden>🕘</span> PAST · {m.past.dayLabel.split(' ')[0]} {m.past.dayNum}</span>
          <button type="button" className="past-back" onClick={() => closePast()}>Back to {m.currentNewest.dayLabel} ›</button>
        </div>
      ) : null}
      <div className="sw-lean">
        <div className="sw-lean-main">
          {/* P2-3: title is read-only (was a full-width "Back to Overview" button); Back/tab bar navigate */}
          <div className="sw-lean-left">
            <div className="sw-lean-class">{m.classLabel}<ChannelBadge /></div>
          </div>
          {/* v0.40.0 (t83u): topic left the header; dates sit right and open the Date panel. */}
          <button
            type="button"
            className="sw-lean-dates"
            aria-haspopup="dialog"
            aria-label={`Dates: ${m.visibleDates.map((d) => d.dayLabel).join(' and ')} — choose dates and edit topics`}
            onClick={(e) => openPopAt(e.currentTarget, m.showTwoCol ? 1 : m.activeDateIndex)}
          >
            {m.visibleDates.map((d) => d.dayNum).join(' · ')}
            <span className="chev" aria-hidden>▾</span>
          </button>
          {/* t76u: '16/44 SET' removed — per-date counts live in the column headers + Quick overview (O). */}
        </div>

        {/* v0.41.0 (t89u/t103u LOCKED): undo · redo right-aligned just left of ⋮; Tools + search live in the ⋮ menu. */}
        <div className="sw-lean-tools">
          <span className="sw-lean-spacer" />
          <button type="button" className="sw-icon-btn" aria-label="Undo" disabled={!m.canUndo} onClick={() => doUndo('undo')}>
            ↶
          </button>
          <button type="button" className="sw-icon-btn" aria-label="Redo" disabled={!m.canRedo} onClick={() => doUndo('redo')}>
            ↷
          </button>
          <button
            ref={menuBtnRef}
            type="button"
            className={`sw-kebab${toolsOpen ? ' on' : ''}`}
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={toolsOpen}
            onClick={() => setToolsOpen((v) => !v)}
          >
            ⋮
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
              {m.visibleDates.map((d, ci) => (
                <span className={`tick sw-dh${gridFocus && kbCol === ci ? ' kb-col' : ''}`} key={d.date}>
                  {/* t83u/t84u: two rows — date, then topic (ellipsis). No counts here; they live in Quick overview. */}
                  <button
                    type="button"
                    className="sw-dh-btn"
                    aria-label={`${d.dayLabel}, topic: ${d.topic || 'none'} — change date`}
                    aria-haspopup="dialog"
                    data-col={ci}
                    onClick={(e) => openPopAt(e.currentTarget, slotOf(ci))}
                  >
                    <span className="sw-dh-date">{d.dayNum}</span>
                    <span className="sw-dh-topic">{d.topic || '—'}</span>
                  </button>
                </span>
              ))}
            </div>
        </div>
      </div>

      {popCol != null ? (
        <DatePopover
          classLabel={m.classLabel}
          sessions={sessionDatesFor(activeClassKey)}
          shown={m.visibleDates.map((d) => d.date)}
          current={m.dates[popSlot.current].date}
          cols={m.showTwoCol ? 2 : 1}
          onCols={(n) => m.setPills(n === 2 ? [true, true] : popSlot.current === 0 ? [true, false] : [false, true])}
          onPick={(iso) => { showIso(iso, popSlot.current); haptic('light'); setPopCol(null) }}
          onEdit={(iso) => { haptic('medium'); setPopCol(null); setDem({ mode: 'edit', from: iso }) }}
          onAdd={() => { setPopCol(null); setDem({ mode: 'add' }) }}
          onClose={() => setPopCol(null)}
          top={popTop.current}
        />
      ) : null}
      {dem ? (
        <DateEditModal
          mode={dem.mode}
          classLabel={m.classLabel}
          sessions={sessionDatesFor(activeClassKey)}
          from={dem.from}
          today={todayIso}
          markCount={dem.from ? countMarks(marksByClass[activeClassKey] ?? {}, dem.from) : 0}
          onClose={() => setDem(null)}
          onSave={(items) => {
            const k = activeClassKey
            if (dem.mode === 'add') {
              for (const it of items) addSession(k, it.iso, it.topic)
              const last = items[items.length - 1]!.iso
              showIso(last, popSlot.current)
              toast(items.length > 1 ? `${items.length} dates added · syncs on next Sync` : `Added ${dm(last)} · syncs on next Sync`)
            } else if (dem.from) {
              const it = items[0]!
              const n = countMarks(marksByClass[k] ?? {}, dem.from)
              moveSession(k, dem.from, it.iso, it.topic)
              if (it.iso !== dem.from) toast(`Moved ${dm(dem.from)} → ${dm(it.iso)}${n ? ` · ${n} mark${n === 1 ? '' : 's'} moved` : ''}`)
              else toast('Saved')
            }
            haptic('success'); setDem(null)
          }}
          onDelete={() => {
            if (!dem.from) return
            const n = countMarks(marksByClass[activeClassKey] ?? {}, dem.from)
            const snap = deleteSession(activeClassKey, dem.from)
            setDem(null); haptic('heavy')
            toast(`Deleted ${dm(snap.date)}${n ? ` · ${n} mark${n === 1 ? '' : 's'}` : ''}`, { action: { label: 'Undo', run: () => { restoreSession(snap); toast(`Restored ${dm(snap.date)}`) } } })
          }}
        />
      ) : null}
      {qoOpen ? (
        <QuickOverviewSheet
          classLabel={m.classLabel}
          mode={m.mode}
          rows={(m.dates[0].date === m.dates[1].date ? [m.dates[0]] : m.dates).map((d) => ({ date: d, ...m.progressFor(d.date) }))}
          left={rosterFor(activeClassKey).filter((r) => r.left).length}
          onClose={() => setQoOpen(false)}
        />
      ) : null}
      {qsOpen ? (
        <QuickSearchHud
          rows={m.filteredRoster}
          onPreview={(roll, idle) => {
            setQsRoll(roll); setQsIdle(idle)
            if (roll != null) {
              const ri = m.filteredRoster.findIndex((r) => r.roll === roll)
              if (ri >= 0) setKb([ri, kbCol])
              scrollToRoll(roll, false) // instant: no tween left running when Enter hands focus to the grid
            }
          }}
          onEnter={(roll) => { setQsOpen(false); setQsRoll(null); focusRoll(roll) }}
          onClose={() => {
            setQsOpen(false); setQsRoll(null)
            const back = qsReturn.current
            requestAnimationFrame(() => { if (back && document.contains(back)) back.focus(); else focusCell(kbRow, kbCol) })
          }}
        />
      ) : null}
      <div className="sw-body">
        <div
          className={`sw-list-wrap${azLeft ? ' az-left' : ''}`}
          ref={listRef}
          onScroll={onListScroll}
        >
          <div className="sr-only" aria-live="polite">{live}</div>
          <div className={`sw-rows${select.active ? ' selecting' : ''}`} role="group" aria-label="Checklist — arrows move, Space ticks, ? for shortcuts" onFocus={() => setGridFocus(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setGridFocus(false) }}>
            {m.filteredRoster.map((r, rowIndex) => {
              const selected = select.selected.has(r.roll)
              const glow = glowRolls.has(r.roll)
              return (
                <div
                  key={r.roll}
                  className={`sw-row ${m.showTwoCol ? 'two' : 'one'}${selected ? ' sel' : ''}${glow ? pendingRowClass(swipeStyle, glowRolls.size, glowValue) : ''}${azFocusRoll === r.roll ? ' az-focus' : ''}${qsOpen && qsRoll === r.roll ? ` qs-hit${qsIdle ? ' qs-idle' : ''}` : ''}`}
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
                        role="checkbox"
                        aria-checked={on}
                        aria-label={`${r.name}, roll ${r.roll}, ${d.dayLabel}${m.visibleDates.length === 2 ? `, date ${colIndex + 1} of 2` : ''}`}
                        tabIndex={rowIndex === kbRow && colIndex === kbCol ? 0 : -1}
                        data-cell={`${rowIndex}-${colIndex}`}
                        onKeyDown={(e) => onCellKey(e, rowIndex, colIndex, r.roll, d.date)}
                        onFocus={() => { if (kb[0] !== rowIndex || kb[1] !== colIndex) setKb([rowIndex, colIndex]) }}
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
          {/* t83u: tick all moved from the header to a footer row — one button per date column. */}
          {m.filteredRoster.length ? (
            <div className={`sw-row sw-tickall-row ${m.showTwoCol ? 'two' : 'one'}`} role="group" aria-label="Tick all">
              <div className="sw-roll" />
              <div className="sw-name sw-tickall-label">All pupils</div>
              {m.visibleDates.map((d) => {
                const st = allState(d.date)
                return (
                  <button
                    key={d.date}
                    type="button"
                    className={`sw-tickall${st === 'on' ? ' on' : ''}`}
                    data-state={st}
                    aria-label={`${st === 'on' ? 'Untick' : 'Tick'} all for ${d.dayLabel}`}
                    onClick={() => tickAll(d.date, st !== 'on')}
                  >
                    {st === 'on' ? 'Untick all' : 'Tick all'}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <AzStrip
          names={m.filteredRoster.map((r) => r.name)}
          rows={m.filteredRoster}
          ref={azRef}
          onJump={onAzJump}
          onEnterGrid={(roll) => { onAzScrubEnd(); focusRoll(roll) }}
          onLeave={() => { onAzScrubEnd(); focusCell(kbRow, kbCol) }}
          onScrubEnd={onAzScrubEnd}
          modeSub={m.mode === 'submitted'}
        />
        {showFab ? (
          <div className={`sw-fab${azLeft ? ' az-left' : ''}`}>
            <button type="button" onClick={() => { closeMenu(); m.setPendingOnly((v) => !v) }}>
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
          <button type="button" className="sw-menu-scrim" aria-label="Close menu" tabIndex={-1} onClick={() => closeMenu()} />
          <div
            className="sw-menu"
            style={menuPos()}
            role="menu"
            aria-label="Checklist actions"
            ref={(el) => { if (el && document.documentElement.dataset.input === 'kbd' && !el.contains(document.activeElement)) el.querySelector<HTMLElement>('[role^=menuitem]')?.focus() }}
            onKeyDown={(e) => {
              const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role^=menuitem]')]
              const i = items.indexOf(document.activeElement as HTMLElement)
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus() }
              else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus() }
              else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus() }
              else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(true) }
              else if (e.key === 'Tab') { closeMenu() }
            }}
          >
            <div className="sw-menu-lbl" aria-hidden>Mode</div>
            <div className="sw-menu-seg" role="group" aria-label="Mode">
              {(['set', 'submitted'] as const).map((md) => (
                <button key={md} type="button" role="menuitemradio" aria-checked={m.mode === md} data-mode={md}
                  className={m.mode === md ? 'on' : ''}
                  onClick={() => { if (m.mode !== md) haptic('medium'); m.setMode(md) }}>
                  {md === 'set' ? 'Set' : 'Submitted'}
                </button>
              ))}
            </div>
            <hr />
            <button type="button" role="menuitem" className="sw-menu-row" onClick={() => { closeMenu(); qsReturn.current = menuBtnRef.current; setQsOpen(true) }}>
              <span className="ic" aria-hidden data-ic="⌕" /><span className="tx">Find pupil</span><span className="k" aria-hidden>/</span>
            </button>
            <button type="button" role="menuitem" className="sw-menu-row" onClick={() => { closeMenu(); m.setSearchOpen(true); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.sw-search input')?.focus()) }}>
              <span className="ic" aria-hidden data-ic="≡" /><span className="tx">Filter by name</span><span className="k" aria-hidden>{navigator.platform.includes('Mac') ? '⌘F' : 'Ctrl+F'}</span>
            </button>
            <button type="button" role="menuitemcheckbox" aria-checked={m.pendingOnly} data-item="pending" className={`sw-menu-row${m.pendingOnly ? ' on' : ''}`} onClick={() => { closeMenu(); m.setPendingOnly((v) => !v) }}>
              <span className="ic" aria-hidden data-ic="●" /><span className="tx">Pending only</span><span className="k" aria-hidden>{m.pendingOnly ? 'On' : 'Off'}</span>
            </button>
            <hr />
            <button type="button" role="menuitem" className="sw-menu-row" onClick={() => { closeMenu(); setQoOpen(true) }}>
              <span className="ic" aria-hidden data-ic="▤" /><span className="tx">Quick overview</span><span className="k" aria-hidden>O</span>
            </button>
            {m.dates.length === 2 ? (
              <button type="button" role="menuitem" className="sw-menu-row" onClick={() => { closeMenu(); setCopyOpen(true) }}>
                <span className="ic" aria-hidden data-ic="⎘" /><span className="tx">Copy marks…</span><span className="k" aria-hidden>›</span>
              </button>
            ) : null}
            <button type="button" role="menuitem" className="sw-menu-row share" onClick={() => { closeMenu(); openShare({ classKey: m.classKey, date: echoDate, dates: m.showTwoCol ? m.visibleDates : undefined }) }}>
              <span className="ic" aria-hidden data-ic="↗" /><span className="tx">Share</span><span className="k" aria-hidden>›</span>
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
