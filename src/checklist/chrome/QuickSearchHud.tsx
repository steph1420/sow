import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { rankMatches, type QsRow } from '../../lib/quickSearch'

type Props = {
  rows: QsRow[]
  initial?: string
  /** Live: focus/scroll this roll (list is never filtered). idle = 1.5 s since the last keystroke. */
  onPreview: (roll: number | null, idle: boolean) => void
  onEnter: (roll: number | null) => void
  onClose: () => void
}

export const QS_IDLE_MS = 1500

/** v0.38.0 Spotlight-style quick find (Steve t67u): "/" opens; type a word; ↑/↓/Tab cycle; Enter into the grid. */
export function QuickSearchHud({ rows, initial = '', onPreview, onEnter, onClose }: Props) {
  const [text, setText] = useState(initial)
  const [idx, setIdx] = useState(0)
  const [idle, setIdle] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const matches = useMemo(() => rankMatches(text, rows), [text, rows])
  const cur = matches.length ? matches[Math.min(idx, matches.length - 1)]! : null
  const curName = cur ? rows.find((r) => r.roll === cur.roll)?.name ?? '' : ''

  useEffect(() => { ref.current?.focus() }, [])
  useEffect(() => { onPreview(cur?.roll ?? null, idle) }, [cur?.roll, idle]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setIdle(false)
    if (!text) return
    const t = window.setTimeout(() => setIdle(true), QS_IDLE_MS)
    return () => window.clearTimeout(t)
  }, [text, idx])

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const n = matches.length
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); if (n) setIdx((i) => (Math.min(i, n - 1) + 1) % n) }
    else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) { e.preventDefault(); if (n) setIdx((i) => (Math.min(i, n - 1) - 1 + n) % n) }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onEnter(cur?.roll ?? null) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
  }

  return (
    <div className="qs-hud" role="search" aria-label="Find pupil">
      <span className="qs-glass" aria-hidden>⌕</span>
      <input
        ref={ref}
        className="qs-input"
        type="text"
        name="sow-quick-find"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Find pupil — type a name, ↑ ↓ for more, Enter to tick"
        aria-describedby="qs-status"
        value={text}
        placeholder="Find pupil…"
        onChange={(e) => { setText(e.target.value); setIdx(0) }}
        onKeyDown={onKey}
        onBlur={(e) => { if (!e.relatedTarget || !(e.currentTarget.parentElement?.contains(e.relatedTarget as Node))) onClose() }}
      />
      <span id="qs-status" className={`qs-count${text && !matches.length ? ' none' : ''}`} aria-live="polite">
        {!text ? 'type a name' : matches.length ? `${Math.min(idx, matches.length - 1) + 1} of ${matches.length}` : 'no match'}
        <span className="sr-only">{curName ? ` · ${curName}` : ''}</span>
      </span>
    </div>
  )
}
