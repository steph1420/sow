import { shortDateLabel } from '../../lib/shortDate'
import type { ColPills, DateInfo, DateSlot } from './types'

type Props = {
  dates: DateInfo[]
  colPills: ColPills
  showTwoCol: boolean
  activeDate: string | null
  activeCount: number
  countFor: (date: string) => number
  onCard: (d: DateInfo) => void
}

export default function CkDateCards({
  dates,
  colPills,
  showTwoCol,
  activeDate,
  activeCount,
  countFor,
  onCard,
}: Props) {
  if (dates.length < 2) return null
  return (
    <div className="ck-date-pair">
      {dates.map((d, i) => {
        const pillOn = d.slot === 'd1' ? colPills.d1 : colPills.d2
        const isFocus = showTwoCol || (pillOn && activeDate === d.date)
        const dim = !pillOn
        const topicShort =
          (d.topic || '—').length > 18 ? `${(d.topic || '—').slice(0, 17)}…` : d.topic || '—'
        return (
          <button
            key={`${d.slot}-${d.date}`}
            type="button"
            className={`ck-dchip${isFocus && !dim ? ' is-focus' : ''}${dim ? ' is-dim' : ''}`}
            onClick={() => onCard(d)}
          >
            <div className="ck-dlft">
              <div className="ck-dl">Date {i + 1}</div>
              <div className="ck-dd">{shortDateLabel(d.date)} ▾</div>
            </div>
            <div className="ck-drt">
              <div className="ck-dt">{topicShort}</div>
              <div className="ck-dp">
                {countFor(d.date)}/{activeCount} set
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export type { DateSlot }
