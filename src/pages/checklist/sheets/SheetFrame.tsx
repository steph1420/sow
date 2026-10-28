import type { ReactNode } from 'react'

export default function SheetFrame({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="ck-sheet-layer" role="presentation">
      <button type="button" className="ck-sheet-scrim" aria-label="Close" onClick={onClose} />
      <div className="ck-sheet" role="dialog" aria-label={title}>
        <div className="ck-sheet-handle" aria-hidden />
        <div className="ck-sheet-head">
          <h3>{title}</h3>
          <button type="button" className="ck-sheet-x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="ck-sheet-body">{children}</div>
      </div>
    </div>
  )
}
