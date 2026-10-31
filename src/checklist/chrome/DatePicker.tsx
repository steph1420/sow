import { useRef, useState, type CSSProperties, type KeyboardEvent as RKE, type PointerEvent as RPE } from 'react'
import { MONTHS, daysInMonth, fromIso, setYear, toIso, keyStep, tapStep, turn, weekdayShort, yearOptions, type DialId, type Ymd } from '../../dates/dial'

/** v0.41.0 (t103u/t108u, mock v4 LOCKED): Year dropdown above Month · Date · Day dials.
 *  Day is display-only and follows the date. Session dates are dotted. Touch: drag a dial (44 px per step).
 *  Keyboard: ↑/↓ turn the focused dial, Tab moves between dials, Enter picks. */
type Props = {
  start: string
  sessions: Map<string, string>
  onChange?: (iso: string) => void
  onEnter: (iso: string) => void
  /** v0.43.0 popup: no Year row (Month dial carries the year; year shown in the date title). */
  compact?: boolean
}
const ROW = 44

export function DatePicker({ start, sessions, onChange, onEnter, compact }: Props) {
  const [v, setV] = useState<Ymd>(() => fromIso(start))
  const set = (n: Ymd) => { setV(n); onChange?.(toIso(n)) }
  const years = yearOptions(new Date().getFullYear(), [...sessions.keys(), start])
  const has = (y: Ymd) => sessions.has(toIso(y))
  const monthHas = (m: number) => [...sessions.keys()].some((k) => k.startsWith(`${v.y}-${String(m).padStart(2, '0')}-`))

  const drag = useRef<{ y0: number; y: number; steps: number; dial: DialId; base: Ymd; k: number; ro: boolean } | null>(null)
  const [snap, setSnap] = useState<{ dial: string; k: number; n: number } | null>(null)
  const down = (e: RPE, dial: DialId, ro = false) => {
    const row = (e.target as HTMLElement).closest?.('[data-k]') as HTMLElement | null
    drag.current = { y0: e.clientY, y: e.clientY, steps: 0, dial, base: v, k: row ? Number(row.dataset.k) : 0, ro }
    if (!ro) try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* synthetic */ }
  }
  const move = (e: RPE) => {
    const d = drag.current; if (!d) return
    d.y = e.clientY
    if (d.ro) return
    const steps = Math.round((d.y0 - e.clientY) / ROW)
    if (steps !== d.steps) { d.steps = steps; set(turn(d.base, d.dial, steps)) }
  }
  // v0.44.1 (t51u): tap a non-centred value → it snaps to centre and is selected; a drag never tap-selects.
  const up = (e?: RPE) => {
    const d = drag.current; drag.current = null
    if (!d || !e) return
    const k = tapStep((e.clientY ?? d.y) - d.y0, d.steps, d.k)
    if (!k) return
    setSnap((p) => ({ dial: d.ro ? 'day' : d.dial, k, n: (p?.n ?? 0) + 1 }))
    set(turn(d.base, d.dial, k))
  }
  const cancel = () => { drag.current = null }
  const key = (e: RKE, dial: DialId) => {
    const st = keyStep(e.key)
    if (st) { e.preventDefault(); e.stopPropagation(); set(turn(v, dial, st)) }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onEnter(toIso(v)) }
  }
  const wheel = (dy: number, dial: DialId) => set(turn(v, dial, dy > 0 ? 1 : -1))

  const around = (dial: 'month' | 'date' | 'day') => [-2, -1, 0, 1, 2].map((o) => {
    if (dial === 'month') { const m = turn(v, 'month', o).m; return { k: o, t: MONTHS[m - 1]!, dot: monthHas(m) } }
    const y = turn(v, 'date', o)
    return { k: o, t: dial === 'date' ? String(y.d) : weekdayShort(y), dot: dial === 'date' && has(y) }
  })
  const dialEl = (dial: 'month' | 'date' | 'day', label: string) => {
    const ro = dial === 'day'
    const vt = dial === 'month' ? MONTHS[v.m - 1]! : dial === 'date' ? String(v.d) : weekdayShort(v)
    return (
      <div
        className={`dp-dial${ro ? ' ro' : ''}`}
        data-dial={dial}
        role="spinbutton"
        aria-label={label}
        aria-valuenow={dial === 'month' ? v.m : dial === 'date' ? v.d : undefined}
        aria-valuemin={ro ? undefined : 1}
        aria-valuemax={ro ? undefined : dial === 'month' ? 12 : daysInMonth(v.y, v.m)}
        aria-valuetext={vt}
        aria-readonly={ro ? 'true' : undefined}
        tabIndex={ro ? -1 : 0}
        onKeyDown={ro ? undefined : (e) => key(e, dial)}
        onPointerDown={(e) => down(e, ro ? 'date' : (dial as DialId), ro)}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onWheel={ro ? undefined : (e) => wheel(e.deltaY, dial)}
      >
        {around(dial).map((x) => (
          <div
            key={snap && snap.dial === dial ? `${x.k}-${snap.n}` : x.k}
            data-k={x.k}
            className={`${x.k === 0 ? 'c' : Math.abs(x.k) === 2 ? 'far' : ''}${snap && snap.dial === dial ? ' dp-snap' : ''}`}
            style={snap && snap.dial === dial ? ({ '--snap': `${snap.k * ROW}px` } as CSSProperties) : undefined}
            aria-hidden
          >
            {x.t}{x.dot ? <span className="dot" /> : null}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="dp-picker" data-iso={toIso(v)}>
      {compact ? null : <div className="dp-picker-top">
        <select className="dp-year" aria-label="Year" value={v.y} onChange={(e) => set(setYear(v, Number(e.target.value)))}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="dp-keys" aria-hidden><kbd>↑</kbd><kbd>↓</kbd> turn · <kbd>Tab</kbd> next · <kbd>Enter</kbd> pick</span>
      </div>}
      <div className="dp-dial-heads" aria-hidden><span>Month</span><span>Date</span><span>Day · auto</span></div>
      <div className="dp-dials">
        <div className="dp-band" aria-hidden />
        {dialEl('month', 'Month')}
        {dialEl('date', 'Date')}
        {dialEl('day', 'Day of week (follows the date)')}
      </div>
    </div>
  )
}
