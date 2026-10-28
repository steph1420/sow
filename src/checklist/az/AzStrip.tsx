import { useCallback, useMemo, useRef, useState } from 'react'
import { usePrefs } from '../../prefs/PrefsContext'
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
}

export function AzStrip({ names, rows, onJump, onScrubEnd, modeSub }: Props) {
  const { prefs } = usePrefs()
  const ref = useRef<HTMLDivElement>(null)
  const present = useMemo(() => presentLetters(names), [names])
  const [hud, setHud] = useState<AzLetter | null>(null)
  const [hudDim, setHudDim] = useState(false)
  const [hi, setHi] = useState<AzLetter | null>(null)
  const left = prefs['az.leftSide']
  const hideEmpty = prefs['az.hideEmpty']
  const showHud = prefs['az.showHud']

  const letters = useMemo(() => {
    if (!hideEmpty) return [...AZ_LETTERS]
    return AZ_LETTERS.filter((L) => L === '*' || present.has(L))
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
      setHi(letter)
      const roll = jumpLetterToRoll(letter, rows)
      onJump(letter, roll)
    },
    [letters, names, onJump, rows, showHud],
  )

  const end = () => {
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
          {hud === '*' ? '•' : hud}
        </div>
      ) : null}
      <div
        className={`sw-az${left ? ' left' : ''}${modeSub ? ' mode-sub' : ''}`}
        ref={ref}
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
          const isStar = L === '*'
          const dim = !hideEmpty && !isStar && !present.has(L)
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
              {isStar ? '•' : L}
            </div>
          )
        })}
      </div>
    </>
  )
}

export { jumpLetterToRoll }
