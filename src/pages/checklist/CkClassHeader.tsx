import type { ReactNode } from 'react'

type Props = {
  title: string
  countsLabel: ReactNode
  dateSolo?: { label: string; onOpen: () => void } | null
  onOpenClass: () => void
}

export default function CkClassHeader({ title, countsLabel, dateSolo, onOpenClass }: Props) {
  return (
    <div className="ck-class-head">
      <div className="ck-class">
        <span className="ck-lbl">Class</span>
        <button type="button" className="ck-value" onClick={onOpenClass}>
          {title} <span className="caret">▾</span>
        </button>
        <div className="ck-count">{countsLabel}</div>
      </div>
      {dateSolo ? (
        <div className="ck-date-solo">
          <span className="ck-lbl">Date</span>
          <button type="button" className="ck-value" onClick={dateSolo.onOpen}>
            {dateSolo.label} <span className="caret">▾</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
