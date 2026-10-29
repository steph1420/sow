import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { azKeyJump } from '../../lib/keyboard'
import { usePrefs } from '../../prefs/PrefsContext'
import { haptic } from '../../lib/haptics'
import {
  AZ_LETTERS,
  azSlotTopPercent,
  jumpLetterToRoll,
  letterAtY,
  letterEmpty,
  presentLetters,
  type AzLetter,
} from '../gestures/azLayout'

type Props = {
  names: string[]
  rows: { roll: number; name: string }[]
  /** Fired each scrub tick with finger letter + latched first-child roll (or null). */
  onJump: (letter: AzLetter, roll: number | null) => void
  /** Scrub ended — clear focus glow after hold. */
  onScrubEnd?: () => void
  modeSub?: boolean
  /** Keyboard: Enter → into the grid at roll; Esc → back to the grid. */
  onEnterGrid?: (roll: number | null) => void
  onLeave?: () => void
}

export type AzStripHandle = { focus: () => void }

export const AzStrip = forwardRef<AzStripHandle, Props>(function AzStrip({ names, rows, onJump, onScrubEnd, modeSub, onEnterGrid, onLeave }, handle) {
  const { prefs } = usePrefs()
  const ref = useRef<HTMLDivElement>(null)
  const present = useMemo(() => presentLetters(names), [names])
  const [hud, setHud] = useState<AzLetter | null>(null)
  const [hudDim, setHudDim] = useState(false)
  const [hi, setHi] = useState<AzLetter | null>(null)
  const lastLetter = useRef<AzLetter | null>(null)
  const left = prefs['az.leftSide']
  const hideEmpty = prefs['az.hideEmpty']
  const showHud = prefs['az.showHud']

  const letters = useMemo(() => {
    if (!hideEmpty) return [...AZ_LETTERS]
    return AZ_LETTERS.filter((L) => present.has(L))
  }, [hideEmpty, present])

  const scrub = useCallback(
    (clientY: number) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const letter = letterAtY(clientY, rect.top, rect.height, letters)
      const empty = letterEmpty(letter, names)
      if (showHud) {
        setHud(letter)
        setHudDim(empty)
      }
      // t169u: one short tick per letter change (never on the same letter)
      if (lastLetter.current !== letter) {
        lastLetter.current = letter
        haptic('selection')
      }
      setHi(letter)
      const roll = jumpLetterToRoll(letter, rows)
      onJump(letter, roll)
    },
    [letters, names, onJump, rows, showHud],
  )

  const kbRoll = useRef<number | null>(null)
  useImperativeHandle(handle, () => ({ focus: () => ref.current?.focus() }), [])
  const kbJump = (L: AzLetter, roll: number | null) => {
    kbRoll.current = roll
    setHi(L)
    if (showHud) { setHud(L); setHudDim(roll == null) }
    onJump(L, roll)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (/^[a-zA-Z]$/.test(e.key)) {
      const hit = azKeyJump(e.key, rows, kbRoll.current)
      if (hit) kbJump(hit.letter as AzLetter, hit.roll)
      e.preventDefault()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const withPupils = letters.filter((L) => present.has(L))
      if (!withPupils.length) return
      const i = hi ? withPupils.indexOf(hi) : -1
      const n = e.key === 'ArrowDown' ? Math.min(withPupils.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1)
      const L = withPupils[n]!
      kbJump(L, jumpLetterToRoll(L, rows))
      e.preventDefault()
    } else if (e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation()
      setHud(null)
      onEnterGrid?.(kbRoll.current)
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation()
      setHud(null); setHi(null)
      onLeave?.()
    }
  }

  const end = () => {
    lastLetter.current = null
    setHud(null)
    setHudDim(false)
    window.setTimeout(() => setHi(null), 600)
    onScrubEnd?.()
  }

  return (
    <>
      {hud && showHud ? (
        <div
          className={`sw-az-hud${left ? ' left' : ''}${hudDim ? ' dim' : ''}${modeSub ? ' mode-sub' : ''}`}
        >
          {hud}
        </div>
      ) : null}
      <div
        className={`sw-az${left ? ' left' : ''}${modeSub ? ' mode-sub' : ''}`}
        ref={ref}
        tabIndex={0}
        role="slider"
        aria-label="A to Z strip — type a letter to jump"
        aria-orientation="vertical"
        aria-valuemin={1}
        aria-valuemax={26}
        aria-valuenow={hi ? AZ_LETTERS.indexOf(hi) + 1 : 1}
        aria-valuetext={hi ? `Letter ${hi}` : 'No letter'}
        aria-keyshortcuts="/"
        data-az-strip
        onKeyDown={onKeyDown}
        onBlur={() => { setHud(null); window.setTimeout(() => setHi(null), 300) }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          scrub(e.clientY)
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0) return
          scrub(e.clientY)
        }}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {letters.map((L, i) => {
          const dim = !hideEmpty && !present.has(L)
          const top = hideEmpty
            ? (i / letters.length) * 100
            : azSlotTopPercent(AZ_LETTERS.indexOf(L))
          return (
            <div
              key={L}
              className={`sw-az-slot${dim ? ' dim' : ''}${hi === L ? ' hi' : ''}`}
              style={{ top: `${top}%`, height: hideEmpty ? `${100 / letters.length}%` : undefined }}
              data-letter={L}
            >
              {L}
            </div>
          )
        })}
      </div>
    </>
  )
})

export { jumpLetterToRoll }
