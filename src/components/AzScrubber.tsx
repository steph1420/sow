import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { AZ_LETTERS } from '../lib/azScrubber'
import { loadPrefs, subscribePrefs, type SowPrefs } from '../lib/sowPrefs'

type Props = {
  active: string | null
  present: Set<string>
  onSelect: (letter: string | null) => void
}

/**
 * Fixed viewport A–Z section index with press-drag fisheye + All (*) clear.
 * Physics knobs come from sow.prefs (`az.*`).
 * Idle gutter only; press width overlays checklist with dim scrim.
 */
export default function AzScrubber({ active, present, onSelect }: Props) {
  const stripRef = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)
  const [hud, setHud] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<SowPrefs>(() => loadPrefs())
  const pendingClear = useRef(false)
  const moved = useRef(false)
  const startY = useRef(0)

  useEffect(() => subscribePrefs(setPrefs), [])

  // Publish idle gutter for list padding (name cards stop just before idle strip)
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--az-idle-width', `${prefs['az.idleWidth']}px`)
    root.style.setProperty('--az-inset-right', `${prefs['az.insetRight']}px`)
    return () => {
      /* leave last values — MarkPage may remount scrubber */
    }
  }, [prefs])

  const letters = useMemo(() => {
    if (!prefs['az.hideEmpty']) return [...AZ_LETTERS]
    return AZ_LETTERS.filter((L) => present.has(L))
  }, [prefs, present])

  const slotCount = letters.length + 1 // ∗ + letters

  const pickFromEvent = useCallback(
    (clientY: number) => {
      const el = stripRef.current
      if (!el) return null as string | null
      const rect = el.getBoundingClientRect()
      const idx = Math.max(0, Math.min(slotCount - 1, Math.floor((clientY - rect.top) / (rect.height / slotCount))))
      const next = idx === 0 ? null : letters[idx - 1] ?? null
      setHud(next ?? '∗')
      onSelect(next)
      return next
    },
    [onSelect, letters, slotCount],
  )

  const onPointerDown = (e: ReactPointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    scrubbing.current = true
    moved.current = false
    startY.current = e.clientY
    const next = pickFromEvent(e.clientY)
    pendingClear.current = next !== null && next === active
    if (!pendingClear.current) onSelect(next)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!scrubbing.current) return
    if (Math.abs(e.clientY - startY.current) > 6) {
      moved.current = true
      pendingClear.current = false
    }
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
    if (pendingClear.current && !moved.current) {
      onSelect(null)
    } else if (!moved.current && !pendingClear.current) {
      pickFromEvent(e.clientY)
    }
    setHud(null)
    pendingClear.current = false
    moved.current = false
  }

  const pressing = hud !== null
  const widen = prefs['az.widenOnPress'] && pressing
  const focusIdx = hud === '∗' || hud === null ? -1 : letters.indexOf(hud as (typeof letters)[number])
  const feCount = prefs['az.fe.count']
  const feRel = prefs['az.fe.relative'] / 100
  const fePush = prefs['az.fe.push'] / 100
  const feStr = prefs['az.fe.strength'] / 100
  const fisheye = prefs['az.mode'] === 'fisheye'
  const inset = prefs['az.insetRight']

  const stripStyle: CSSProperties = {
    width: widen ? prefs['az.pressWidth'] : prefs['az.idleWidth'],
    right: `calc(max(0px, (100vw - 480px) / 2) + ${inset}px)`,
    ['--az-press-font' as string]: `${prefs['az.pressFont']}px`,
    ['--az-focus-font' as string]: `${prefs['az.focusFont']}px`,
  }

  function letterStyle(L: string, idx: number): CSSProperties | undefined {
    if (!pressing) return undefined
    const isFocus = hud === L
    if (isFocus) {
      return {
        fontSize: prefs['az.focusFont'],
        transform: `scale(${1 + feStr * 0.35})`,
        zIndex: 2,
      }
    }
    if (!fisheye || focusIdx < 0) {
      return widen ? { fontSize: prefs['az.pressFont'] } : undefined
    }
    const dist = Math.abs(idx - focusIdx)
    if (dist === 0 || dist > feCount) {
      return widen ? { fontSize: prefs['az.pressFont'] } : undefined
    }
    const t = 1 - dist / (feCount + 1)
    const scale = 1 + t * feRel * feStr
    const pushPx = t * fePush * 10 * (idx < focusIdx ? -1 : 1)
    return {
      fontSize: prefs['az.pressFont'] * (0.85 + t * 0.4),
      transform: `translateX(${pushPx}px) scale(${scale})`,
      zIndex: 1,
    }
  }

  return (
    <>
      {widen ? <div className="az-scrub-dim" aria-hidden /> : null}
      <div
        ref={stripRef}
        className={`az-scrub${widen ? ' wide' : ''}`}
        role="navigation"
        aria-label="Jump by letter"
        style={stripStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <span
          className={`az-scrub-slot all${active === null ? ' on' : ''}${hud === '∗' ? ' mag' : ''}`}
          data-letter="*"
          style={
            hud === '∗'
              ? { fontSize: prefs['az.focusFont'] }
              : widen
                ? { fontSize: prefs['az.pressFont'] }
                : undefined
          }
        >
          ∗
        </span>
        {letters.map((L, idx) => {
          const has = present.has(L)
          const isOn = active === L
          const isHud = hud === L
          return (
            <span
              key={L}
              className={`az-scrub-slot${has ? '' : ' dim'}${isOn ? ' on' : ''}${isHud ? ' mag' : ''}`}
              data-letter={L}
              style={letterStyle(L, idx)}
            >
              {L}
            </span>
          )
        })}
      </div>
      {prefs['az.showHud'] && hud ? (
        <div className="az-scrub-hud" aria-hidden>
          {hud}
        </div>
      ) : null}
    </>
  )
}
