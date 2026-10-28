import type { ReactNode } from 'react'

type Props = {
  title: string
  onBack: () => void
  children: ReactNode
}

export function MoreChrome({ title, onBack, children }: Props) {
  return (
    <div className="more-page">
      <div className="more-top">
        <button type="button" className="more-back" onClick={onBack}>
          ← Back
        </button>
        <div className="more-heading">{title}</div>
      </div>
      <div className="more-body">{children}</div>
    </div>
  )
}
