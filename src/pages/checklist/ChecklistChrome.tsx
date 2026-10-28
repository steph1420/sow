import type { ReactNode } from 'react'
import CkClassHeader from './CkClassHeader'
import CkDateCards from './CkDateCards'
import CkFilterRow from './CkFilterRow'
import CkModeBar from './CkModeBar'
import CkSearchBar from './CkSearchBar'
import type { UndoChrome } from '../../lib/sowPrefs'
import type { ColPills, DateInfo, DateSlot, Mode, SetFilter } from './types'

type Props = {
  classTitle: string
  countsLabel: ReactNode
  hasTwoDates: boolean
  dates: DateInfo[]
  colPills: ColPills
  showTwoCol: boolean
  activeDate: string | null
  activeCount: number
  countFor: (date: string) => number
  dateSoloLabel: string | null
  mode: Mode
  onMode: (m: Mode) => void
  undoOk: boolean
  redoOk: boolean
  onUndo: () => void
  onRedo: () => void
  undoChrome: UndoChrome
  showPending: boolean
  showSearch: boolean
  setFilter: SetFilter
  onTogglePending: () => void
  d1: DateInfo | null
  d2: DateInfo | null
  onTogglePill: (slot: DateSlot) => void
  onCopy: () => void
  searchOpen: boolean
  q: string
  onToggleSearch: () => void
  onSearchChange: (v: string) => void
  onSearchClear: () => void
  onOpenClass: () => void
  onOpenCal: () => void
  onDateCard: (d: DateInfo) => void
  topicOneCol?: string | null
}

export default function ChecklistChrome(p: Props) {
  return (
    <>
      <CkClassHeader
        title={p.classTitle}
        countsLabel={p.countsLabel}
        dateSolo={
          !p.hasTwoDates && p.dateSoloLabel
            ? { label: p.dateSoloLabel, onOpen: p.onOpenCal }
            : null
        }
        onOpenClass={p.onOpenClass}
      />
      {p.hasTwoDates ? (
        <CkDateCards
          dates={p.dates}
          colPills={p.colPills}
          showTwoCol={p.showTwoCol}
          activeDate={p.activeDate}
          activeCount={p.activeCount}
          countFor={p.countFor}
          onCard={p.onDateCard}
        />
      ) : p.topicOneCol != null ? (
        <div className="ck-topic-row">
          <div className="ck-topic">
            <span className="ck-lbl">Topic</span>
            <div className="ck-topic-text">{p.topicOneCol || '—'}</div>
          </div>
        </div>
      ) : null}
      <CkModeBar
        mode={p.mode}
        onMode={p.onMode}
        undoOk={p.undoOk}
        redoOk={p.redoOk}
        onUndo={p.onUndo}
        onRedo={p.onRedo}
        undoChrome={p.undoChrome}
      />
      <CkFilterRow
        showPending={p.showPending}
        showSearch={p.showSearch}
        setFilter={p.setFilter}
        onTogglePending={p.onTogglePending}
        hasTwoDates={p.hasTwoDates}
        d1={p.d1}
        d2={p.d2}
        colPills={p.colPills}
        onTogglePill={p.onTogglePill}
        onCopy={p.onCopy}
        searchOpen={p.searchOpen}
        hasQuery={!!p.q}
        onToggleSearch={p.onToggleSearch}
      />
      {p.searchOpen ? (
        <CkSearchBar q={p.q} onChange={p.onSearchChange} onClear={p.onSearchClear} />
      ) : null}
    </>
  )
}
