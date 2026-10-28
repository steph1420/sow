import { useEffect, useRef } from 'react'

type Props = {
  q: string
  onChange: (v: string) => void
  onClear: () => void
}

/**
 * Autofill-safe roster filter.
 * Phase 4: full visualViewport pin; Phase 1: sticky-friendly bar + safe attrs.
 */
export default function CkSearchBar({ q, onChange, onClear }: Props) {
  const wrapRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const pin = () => {
      const vv = window.visualViewport
      if (!vv) return
      // Soft pin: scroll bar into visible viewport when keyboard opens
      const rect = el.getBoundingClientRect()
      if (rect.top < vv.offsetTop + 4 || rect.bottom > vv.offsetTop + vv.height) {
        el.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
    }
    pin()
    window.visualViewport?.addEventListener('resize', pin)
    window.visualViewport?.addEventListener('scroll', pin)
    return () => {
      window.visualViewport?.removeEventListener('resize', pin)
      window.visualViewport?.removeEventListener('scroll', pin)
    }
  }, [])

  return (
    <form
      className="ck-search"
      ref={wrapRef}
      autoComplete="off"
      onSubmit={(e) => e.preventDefault()}
    >
      <span aria-hidden>⌕</span>
      <input
        type="search"
        name="sow-roster-filter"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        inputMode="search"
        autoFocus
        value={q}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search name or roll"
        aria-label="Filter roster by name or roll"
      />
      {q ? (
        <button type="button" className="ck-search-x" aria-label="Clear search" onClick={onClear}>
          ×
        </button>
      ) : null}
    </form>
  )
}
