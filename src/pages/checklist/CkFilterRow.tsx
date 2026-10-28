import { sheetDayNumber } from '../../lib/shortDate'
import type { ColPills, DateInfo, DateSlot, SetFilter } from './types'

type Props = {
  showPending: boolean
  showSearch: boolean
  setFilter: SetFilter
  onTogglePending: () => void
  hasTwoDates: boolean
  d1: DateInfo | null
  d2: DateInfo | null
  colPills: ColPills
  onTogglePill: (slot: DateSlot) => void
  onCopy: () => void
  searchOpen: boolean
  hasQuery: boolean
  onToggleSearch: () => void
}

export default function CkFilterRow({
  showPending,
  showSearch,
  setFilter,
  onTogglePending,
  hasTwoDates,
  d1,
  d2,
  colPills,
  onTogglePill,
  onCopy,
  searchOpen,
  hasQuery,
  onToggleSearch,
}: Props) {
  return (
    <div className="ck-chip-row">
      {showPending ? (
        <button
          type="button"
          className={`ck-chip${setFilter === 'pending' ? ' is-on' : ''}`}
          onClick={onTogglePending}
        >
          <span className="dot" aria-hidden>
            ●
          </span>{' '}
          Pending
        </button>
      ) : null}
      {hasTwoDates && d1 ? (
        <button
          type="button"
          className={`ck-chip ck-date-pill${colPills.d1 ? ' is-on' : ' is-off'}`}
          aria-pressed={colPills.d1}
          aria-label={`Show date ${sheetDayNumber(d1.date)}`}
          onClick={() => onTogglePill('d1')}
        >
          {sheetDayNumber(d1.date)}
        </button>
      ) : null}
      {hasTwoDates && d2 ? (
        <button
          type="button"
          className={`ck-chip ck-date-pill${colPills.d2 ? ' is-on' : ' is-off'}`}
          aria-pressed={colPills.d2}
          aria-label={`Show date ${sheetDayNumber(d2.date)}`}
          onClick={() => onTogglePill('d2')}
        >
          {sheetDayNumber(d2.date)}
        </button>
      ) : null}
      {hasTwoDates ? (
        <button type="button" className="ck-copy" onClick={onCopy}>
          ⎘ Copy…
        </button>
      ) : null}
      {showSearch ? (
        <button
          type="button"
          className={`ck-search-btn${searchOpen || hasQuery ? ' is-on' : ''}`}
          aria-label="Search"
          aria-expanded={searchOpen}
          onClick={onToggleSearch}
          style={hasTwoDates ? undefined : { marginLeft: 'auto' }}
        >
          ⌕
        </button>
      ) : null}
    </div>
  )
}
