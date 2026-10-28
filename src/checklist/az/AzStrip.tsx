import { useCallback, useMemo, useRef, useState } from 'react'
import { usePrefs } from '../../prefs/PrefsContext'
import {
  AZ_LETTERS,
  azSlotTopPercent,
  firstLetterOfName,
  letterAtY,
  presentLetters,
  type AzLetter,
} from '../gestures/azLayout'

type Props = {
  names: string[]
  onJump: (letter: AzLetter) => void
}

export function AzStrip({ names, onJump }: Props) {
  const { prefs } = usePrefs()
  const ref = useRef<HTMLDivElement>(null)
  const present = useMemo(() => presentLetters(names), [names])
  const [hud, setHud] = useState<AzLetter | null>(null)
  const [hi, setHi] = useState<AzLetter | null>(null)
  const left = prefs['az.leftSide']
  const hideEmpty = prefs['az.hideEmpty']
  const showHud = prefs['az.showHud']

  const scrub = useCallback(
    (clientY: number) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const letter = letterAtY(clientY, rect.top, rect.height)
      if (showHud) setHud(letter)
      setHi(letter)
      onJump(letter)
    },
    [onJump, showHud],
  )

  const letters = useMemo(() => {
    if (!hideEmpty) return [...AZ_LETTERS]
    return AZ_LETTERS.filter((L) => L === '*' || present.has(L))
  }, [hideEmpty, present])

  return (
    <>
      {hud && showHud ? (
        <div className={`sw-az-hud${left ? ' left' : ''}`}>{hud === '*' ? '•' : hud}</div>
      ) : null}
      <div
        className={`sw-az${left ? ' left' : ''}`}
        ref={ref}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          scrub(e.clientY)
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0) return
          scrub(e.clientY)
        }}
        onPointerUp={() => {
          setHud(null)
          window.setTimeout(() => setHi(null), 600)
        }}
        onPointerCancel={() => {
          setHud(null)
          setHi(null)
        }}
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

export function jumpLetterToRoll(
  letter: AzLetter,
  rows: { roll: number; name: string }[],
): number | null {
  if (letter === '*') return rows[0]?.roll ?? null
  const hit = rows.find((r) => firstLetterOfName(r.name) === letter)
  return hit?.roll ?? null
}
