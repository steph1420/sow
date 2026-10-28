import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { AZ_LETTERS, AZ_SLOT_COUNT } from '../../lib/azScrubber'
import { loadPrefs, subscribePrefs, type SowPrefs } from '../../lib/sowPrefs'
import { azAbsoluteSlotLayouts, azIdleLetterFontPx } from './lib/azLayout'

type Props = {
  active: string | null
  present: Set<string>
  onJump: (letter: string | null) => void
  /** When FAB hidden, bottom sits above tab bar. */
  fabVisible: boolean
}

/**
 * A–Z scroll-to strip — absolute % slots, idle width from prefs (default 42),
 * letter font floor ≥11px. Never filters the list.
 */
export default function CkAzStrip({ active, present, onJump, fabVisible }: Props) {
  const stripRef = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)
  const [hud, setHud] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<SowPrefs>(() => loadPrefs())
  const [fontPx, setFontPx] = useState(11)
  const moved = useRef(false)
  const startY = useRef(0)

  useEffect(() => subscribePrefs(setPrefs), [])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--ck-az-idle-w', `${prefs['az.idleWidth']}px`)
    root.style.setProperty('--ck-az-inset', `${prefs['az.insetRight']}px`)
    root.style.setProperty(
      '--ck-az-bottom',
      fabVisible ? `calc(134px + var(--safe-bottom))` : `calc(72px + var(--safe-bottom))`,
    )
  }, [prefs, fabVisible])

  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const measure = () => {
      setFontPx(azIdleLetterFontPx(el.getBoundingClientRect().height))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [prefs, fabVisible])

  const letters = useMemo(() => {
    if (!prefs['az.hideEmpty']) return [...AZ_LETTERS]
    return AZ_LETTERS.filter((L) => present.has(L))
  }, [prefs, present])

  const slotCount = letters.length + 1
  const layouts = useMemo(() => azAbsoluteSlotLayouts(slotCount), [slotCount])

  const pickFromEvent = useCallback(
    (clientY: number) => {
      const el = stripRef.current
      if (!el) return null as string | null
      const rect = el.getBoundingClientRect()
      const idx = Math.max(
        0,
        Math.min(slotCount - 1, Math.floor((clientY - rect.top) / (rect.height / slotCount))),
      )
      const next = idx === 0 ? null : letters[idx - 1] ?? null
      setHud(next ?? '∗')
      onJump(next)
      return next
    },
    [onJump, letters, slotCount],
  )

  const onPointerDown = (e: ReactPointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    scrubbing.current = true
    moved.current = false
    startY.current = e.clientY
    pickFromEvent(e.clientY)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!scrubbing.current) return
    if (Math.abs(e.clientY - startY.current) > 4) moved.current = true
    pickFromEvent(e.clientY)
  }

  const endPointer = (e: ReactPointerEvent) => {
    if (!scrubbing.current) return
    scrubbing.current = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    if (!moved.current) pickFromEvent(e.clientY)
    setHud(null)
    moved.current = false
  }

  const onLeft = prefs['az.leftSide']
  const showHud = prefs['az.showHud'] && hud !== null
  const idleW = prefs['az.idleWidth']

  const style: CSSProperties = {
    width: idleW,
    fontSize: fontPx,
  }

  const slots: { key: string; label: string; dim: boolean; on: boolean; top: string }[] = [
    {
      key: '*',
      label: '∗',
      dim: false,
      on: active === null && hud === '∗',
      top: layouts[0]?.topPct != null ? `${layouts[0].topPct}%` : '0%',
    },
  ]
  for (let i = 0; i < letters.length; i++) {
    const L = letters[i]
    const lay = layouts[i + 1]
    slots.push({
      key: L,
      label: L,
      dim: !present.has(L),
      on: active === L || hud === L,
      top: lay ? `${lay.topPct}%` : `${((i + 1.5) / AZ_SLOT_COUNT) * 100}%`,
    })
  }

  return (
    <>
      <div
        ref={stripRef}
        className={`ck-az${onLeft ? ' is-left' : ''}`}
        style={style}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        role="navigation"
        aria-label="A to Z scroll"
      >
        {slots.map((s) => (
          <span
            key={s.key}
            className={`ck-az-slot${s.key === '*' ? ' is-all' : ''}${s.dim ? ' is-dim' : ''}${s.on ? ' is-on' : ''}`}
            style={{ top: s.top, fontSize: Math.max(fontPx, 11) }}
          >
            {s.label}
          </span>
        ))}
      </div>
      {showHud ? <div className="ck-az-hud">{hud}</div> : null}
    </>
  )
}
