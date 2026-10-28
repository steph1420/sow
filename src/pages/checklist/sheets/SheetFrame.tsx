import type { ReactNode } from 'react'

export default function SheetFrame({
  title,
  onClose,
  children,
  dismissOnScrim = true,
  hint,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  dismissOnScrim?: boolean
  hint?: string
}) {
  return (
    <div className="ck-sheet-layer" role="presentation">
      <button
        type="button"
        className={`ck-sheet-scrim${dismissOnScrim ? '' : ' is-locked'}`}
        aria-label={dismissOnScrim ? 'Close' : 'Sheet open'}
        onClick={dismissOnScrim ? onClose : undefined}
      />
      <div className="ck-sheet" role="dialog" aria-label={title}>
        <div className="ck-sheet-handle" aria-hidden />
        <div className="ck-sheet-head">
          <h3>{title}</h3>
          <button type="button" className="ck-sheet-x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {hint ? <div className="ck-sheet-hint">{hint}</div> : null}
        <div className="ck-sheet-body">{children}</div>
      </div>
    </div>
  )
}
