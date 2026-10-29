import type { ReactNode } from 'react'

type Props = {
  title: string
  onBack: () => void
  children: ReactNode
  /** Optional right-side header action (e.g. Sharing “＋ New”). */
  action?: ReactNode
}

export function MoreChrome({ title, onBack, children, action }: Props) {
  return (
    <div className="more-page">
      <div className="more-top">
        <button type="button" className="more-back" onClick={onBack}>
          ← Back
        </button>
        <div className="more-heading">{title}</div>
        {action ? <div className="more-action">{action}</div> : null}
      </div>
      <div className="more-body">{children}</div>
    </div>
  )
}
