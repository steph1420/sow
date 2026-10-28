import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { usePrefs } from '../prefs/PrefsContext'
import { CheckMark } from '../components/CheckMark'
import { AzStrip, jumpLetterToRoll } from './az/AzStrip'
import { SearchBar } from './chrome/SearchBar'
import { SelectBar } from './chrome/SelectBar'
import type { AzLetter } from './gestures/azLayout'
import {
  paintRoll,
  rollAtY,
  shouldEngagePaint,
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
import { useChecklistModel } from './state/useChecklistModel'
import './checklist.css'

type RowGeom = { roll: number; top: number; bottom: number }

/**
 * Phase B Checklist — new gesture system from psychology contracts.
 * Not a port of MarkPage / ck-* / useHoldPaint.
 */
export function ChecklistPage() {
  const m = useChecklistModel()
  const { prefs } = usePrefs()
  const showFab = prefs['chrome.showFab']
  const azLeft = prefs['az.leftSide']
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef(new Map<number, HTMLDivElement>())
  const [select, setSelect] = useState<SelectModel>(() => createSelectModel())
  const [glowRolls, setGlowRolls] = useState<Set<number>>(() => new Set())
  const [copyOpen, setCopyOpen] = useState(false)

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

  const scrollToRoll = useCallback((roll: number) => {
    const el = rowRefs.current.get(roll)
    const wrap = listRef.current
    if (!el || !wrap) return
    const er = el.getBoundingClientRect()
    const wr = wrap.getBoundingClientRect()
    const mid = wr.top + wr.height * 0.45
    const delta = er.top + er.height / 2 - mid
    wrap.scrollTop += delta
  }, [])

  const onAzJump = useCallback(
    (letter: AzLetter) => {
      const roll = jumpLetterToRoll(letter, m.filteredRoster)
      if (roll != null) scrollToRoll(roll)
    },
    [m.filteredRoster, scrollToRoll],
  )

  // ——— Check paint / tap ———
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
      // Engage — no hold delay; mostly-horizontal
      st.session = startPaintSession(st.startCol, st.startValue, st.startRoll)
      // 1-col: brush the visible date; 2-col: opposite ✓
      if (!m.showTwoCol) st.session.targetCol = st.startCol
      st.engaged = true
      setGlowRolls(new Set([st.startRoll]))
    }

    if (!st.session) return
    const roll = rollAtY(e.clientY, measureRows())
    if (roll == null) return
    if (paintRoll(st.session, roll)) {
      setGlowRolls(new Set(st.session.paintedRolls))
    }
  }

  const finishPaint = (e: ReactPointerEvent, didTap: boolean) => {
    const st = paintRef.current
    paintRef.current = null
    if (!st || st.pointerId !== e.pointerId) return

    if (st.engaged && st.session) {
      const date = m.dates[st.session.targetCol]!.date
      const rolls = [...st.session.paintedRolls]
      m.paintCells(rolls, date, st.session.paintValue)
      window.setTimeout(() => setGlowRolls(new Set()), 280)
      return
    }

    if (didTap) {
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

  // ——— Name hold → select ———
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
      nameHoldRef.current = null
    }, SELECT_HOLD_MS)
    nameHoldRef.current = { roll, startX, startY, timer, pointerId }
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
    // short tap on name in mark mode: no-op (hold enters select; scroll uses pan-y)
  }

  // ——— Roll drag select ———
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
    setSelect((s) => applyRollDrag(s, orderedRolls, roll))
  }

  const onRollPointerUp = (e: ReactPointerEvent) => {
    if (rollDragRef.current?.pointerId === e.pointerId) rollDragRef.current = null
  }

  // Select actions
  const selectedRolls = [...select.selected]
  const onSelectMark = () => {
    if (!selectedRolls.length) return
    const targets = selectedRolls.flatMap((roll) =>
      m.visibleDates.map((d) => ({ roll, date: d.date })),
    )
    m.setCellsValue(targets, true)
  }
  const onSelectClear = () => {
    if (!selectedRolls.length) return
    const targets = selectedRolls.flatMap((roll) =>
      m.visibleDates.map((d) => ({ roll, date: d.date })),
    )
    m.setCellsValue(targets, false)
  }

  const copyDate = (from: 0 | 1, to: 0 | 1) => {
    m.copyField(m.dates[from]!.date, m.dates[to]!.date)
    setCopyOpen(false)
  }

  // tick-all for a visible date
  const tickAll = (date: string, value: boolean) => {
    m.setCellsValue(
      m.filteredRoster.map((r) => ({ roll: r.roll, date })),
      value,
    )
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

  // Escape select on back? Done button handles it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelect(exitSelect())
        setCopyOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const p0 = m.progressFor(m.dates[0].date)
  const p1 = m.progressFor(m.dates[1].date)

  return (
    <div className="sw-page">
      {select.active ? (
        <SelectBar
          count={select.selected.size}
          onMark={onSelectMark}
          onClear={onSelectClear}
          onDone={() => setSelect(exitSelect())}
        />
      ) : null}

      <div className="sw-chrome">
        <div>
          <div className="sw-lbl">Class</div>
          <div className="sw-val">{m.classLabel} ▾</div>
          <div className="sw-counts">
            <b>{p0.n}</b>
            {' · '}
            <b>{p1.n}</b>
            {' / '}
            {m.counts.active} {m.mode === 'set' ? 'set' : 'submitted'}
          </div>
        </div>

        <div className="sw-date-pair">
          {m.dates.map((d, i) => {
            const on = m.pills[i as 0 | 1]
            const prog = i === 0 ? p0 : p1
            return (
              <button
                key={d.date}
                type="button"
                className={`sw-dchip${on ? ' on' : ' dim'}`}
                onClick={() => {
                  // tap focused card is fine; pills own col agency
                }}
              >
                <div>
                  <div className="dl">Date {i + 1}</div>
                  <div className="dd">{d.dayLabel} ▾</div>
                </div>
                <div className="drt">
                  <div className="dt">{d.topic}</div>
                  <div className="dp">
                    {prog.n}/{prog.total} {m.mode === 'set' ? 'set' : 'sub'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="sw-mode-row">
          <div className="sw-modebar">
            <button
              type="button"
              className={m.mode === 'set' ? 'on' : ''}
              onClick={() => m.setMode('set')}
            >
              Set
            </button>
            <button
              type="button"
              className={m.mode === 'submitted' ? 'on' : ''}
              onClick={() => m.setMode('submitted')}
            >
              Submitted
            </button>
          </div>
          <div className="sw-undo-pair">
            <button type="button" className="sw-icon-btn" disabled={!m.canUndo} onClick={m.undo}>
              ↶
            </button>
            <button type="button" className="sw-icon-btn" disabled={!m.canRedo} onClick={m.redo}>
              ↷
            </button>
          </div>
        </div>

        <div className="sw-chip-row">
          <button
            type="button"
            className={`sw-chip${m.pendingOnly ? ' on' : ''}`}
            onClick={() => m.setPendingOnly((v) => !v)}
          >
            <span className="dot">●</span> Pending
          </button>
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
          {m.dates.length === 2 ? (
            <button type="button" className="sw-copy-chip" onClick={() => setCopyOpen(true)}>
              ⎘ Copy…
            </button>
          ) : null}
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

      <div className="sw-body">
        <div className={`sw-list-wrap${azLeft ? ' az-left' : ''}`} ref={listRef}>
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
                    aria-label={`Toggle all ${d.dayLabel}`}
                    onClick={() => tickAll(d.date, st !== 'on')}
                  >
                    {st !== 'off' ? <CheckMark size={12} /> : null}
                  </button>
                </span>
              )
            })}
          </div>

          <div className="sw-rows">
            {m.filteredRoster.map((r) => {
              const selected = select.selected.has(r.roll)
              const glow = glowRolls.has(r.roll)
              return (
                <div
                  key={r.roll}
                  className={`sw-row ${m.showTwoCol ? 'two' : 'one'}${selected ? ' sel' : ''}${glow ? ' paint-glow' : ''}`}
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
                    onPointerMove={onNamePointerMove}
                    onPointerUp={onNamePointerUp}
                    onPointerCancel={clearNameHold}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {r.name}
                  </div>
                  {m.visibleDates.map((d, colIndex) => {
                    const on = m.isOn(r.roll, d.date)
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
                        <div className={`sw-check${on ? ' on' : ''}${glow && on ? ' trail' : ''}`}>
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

        <AzStrip names={m.filteredRoster.map((r) => r.name)} onJump={onAzJump} />
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
