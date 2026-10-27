import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { AZ_LETTERS, letterFromSlot, slotFromY } from '../lib/azScrubber'

type Props = {
  active: string | null
  present: Set<string>
  onSelect: (letter: string | null) => void
}

/**
 * Fixed viewport A–Z section index with press-drag fisheye + All (*) clear.
 * Does not scroll with the Mark list.
 */
export default function AzScrubber({ active, present, onSelect }: Props) {
  const stripRef = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)
  const [hud, setHud] = useState<string | null>(null)
  const pendingClear = useRef(false)
  const moved = useRef(false)
  const startY = useRef(0)

  const pickFromEvent = useCallback(
    (clientY: number) => {
      const el = stripRef.current
      if (!el) return null as string | null
      const rect = el.getBoundingClientRect()
      const next = letterFromSlot(slotFromY(clientY, rect.top, rect.height))
      setHud(next ?? '∗')
      onSelect(next)
      return next
    },
    [onSelect],
  )

  const onPointerDown = (e: ReactPointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    scrubbing.current = true
    moved.current = false
    startY.current = e.clientY
    const el = stripRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const next = letterFromSlot(slotFromY(e.clientY, rect.top, rect.height))
    // Tap same letter again → clear on release (unless we drag)
    pendingClear.current = next !== null && next === active
    setHud(next ?? '∗')
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
      // tap on All or a new letter — ensure final value stuck
      const el = stripRef.current
      if (el) {
        const rect = el.getBoundingClientRect()
        onSelect(letterFromSlot(slotFromY(e.clientY, rect.top, rect.height)))
      }
    }
    setHud(null)
    pendingClear.current = false
    moved.current = false
  }

  return (
    <>
      <div
        ref={stripRef}
        className="az-scrub"
        role="navigation"
        aria-label="Jump by letter"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <span className={`az-scrub-slot all${active === null ? ' on' : ''}`} data-letter="*">
          ∗
        </span>
        {AZ_LETTERS.map((L) => {
          const has = present.has(L)
          const isOn = active === L
          const isHud = hud === L
          return (
            <span
              key={L}
              className={`az-scrub-slot${has ? '' : ' dim'}${isOn ? ' on' : ''}${isHud ? ' mag' : ''}`}
              data-letter={L}
            >
              {L}
            </span>
          )
        })}
      </div>
      {hud && (
        <div className="az-scrub-hud" aria-hidden>
          {hud}
        </div>
      )}
    </>
  )
}
