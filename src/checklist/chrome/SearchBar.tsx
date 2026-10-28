import { useEffect, useRef } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  onClose: () => void
}

/** Autofill-safe search; snaps list to top on focus; soft sticky pin. */
export function SearchBar({ value, onChange, onClose }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <div className="sw-search pinned">
      <input
        ref={ref}
        type="search"
        name="sow-roster-filter"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="search"
        enterKeyHint="search"
        placeholder="Search name or roll"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          // Snap roster scroller to top of visible area
          const wrap = document.querySelector('.sw-list-wrap')
          if (wrap instanceof HTMLElement) wrap.scrollTop = 0
          // Soft visualViewport pin — keep chrome visible when keyboard opens
          const vv = window.visualViewport
          if (vv) {
            const pin = () => {
              /* sticky .pinned handles most cases; vv listener keeps scroll glued */
              if (wrap instanceof HTMLElement && document.activeElement === ref.current) {
                wrap.scrollTop = Math.min(wrap.scrollTop, 8)
              }
            }
            vv.addEventListener('resize', pin)
            vv.addEventListener('scroll', pin)
            const clear = () => {
              vv.removeEventListener('resize', pin)
              vv.removeEventListener('scroll', pin)
            }
            ref.current?.addEventListener('blur', clear, { once: true })
          }
        }}
      />
      <button type="button" className="sw-chip" onClick={onClose}>
        Done
      </button>
    </div>
  )
}
