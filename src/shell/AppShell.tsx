import { useCallback, useState } from 'react'
import { CheckMark } from '../components/CheckMark'
import type { ClassKey } from '../data/types'
import { useWorkspace } from '../demo/WorkspaceContext'
import { DevPage } from '../more/DevPage'
import { HistoryPage } from '../more/HistoryPage'
import { popRoute, pushRoute, topRoute, type MoreStack } from '../more/navStack'
import { RosterPage } from '../more/RosterPage'
import { SettingsPage } from '../more/SettingsPage'
import { SyncPage } from '../more/SyncPage'
import { ChecklistScreen } from '../screens/ChecklistScreen'
import { OverviewScreen } from '../screens/OverviewScreen'

export type TabId = 'checklist' | 'overview'

/**
 * AppShell — Overview · Checklist · More popup (Portal IA v0.23).
 * Default landing = Overview (Steve t141u). More stays popup (t137u).
 */
export function AppShell() {
  const { setActiveClassKey } = useWorkspace()
  const [tab, setTab] = useState<TabId>('overview')
  const [moreOpen, setMoreOpen] = useState(false)
  const [stack, setStack] = useState<MoreStack>([])

  const openMore = useCallback(() => setMoreOpen(true), [])
  const closeMore = useCallback(() => setMoreOpen(false), [])

  const goMore = useCallback((route: 'roster' | 'history' | 'settings') => {
    setMoreOpen(false)
    setStack([route])
  }, [])

  const onBack = useCallback(() => {
    setStack((s) => popRoute(s))
  }, [])

  const openChecklist = useCallback(() => {
    setMoreOpen(false)
    setStack([])
    setTab('checklist')
  }, [])

  const openOverview = useCallback(() => {
    setMoreOpen(false)
    setStack([])
    setTab('overview')
  }, [])

  const top = topRoute(stack)

  if (top) {
    if (top === 'roster') {
      return (
        <div className="app-shell">
          <RosterPage onBack={onBack} />
        </div>
      )
    }
    if (top === 'history') {
      return (
        <div className="app-shell">
          <HistoryPage
            onBack={onBack}
            onOpenSession={(key) => {
              setActiveClassKey(key as ClassKey)
              setStack([])
              setTab('checklist')
            }}
          />
        </div>
      )
    }
    if (top === 'settings') {
      return (
        <div className="app-shell">
          <SettingsPage
            onBack={onBack}
            onOpenDev={() => setStack((s) => pushRoute(s, 'dev'))}
            onOpenSync={() => setStack((s) => pushRoute(s, 'sync'))}
          />
        </div>
      )
    }
    if (top === 'dev') {
      return (
        <div className="app-shell">
          <DevPage onBack={onBack} />
        </div>
      )
    }
    if (top === 'sync') {
      return (
        <div className="app-shell">
          <SyncPage onBack={onBack} />
        </div>
      )
    }
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        {tab === 'overview' ? (
          <OverviewScreen onOpenChecklist={openChecklist} />
        ) : (
          <ChecklistScreen onGoOverview={openOverview} />
        )}
      </main>

      {moreOpen ? (
        <>
          <button type="button" className="scrim" aria-label="Dismiss More" onClick={closeMore} />
          <div className="more-pop" role="dialog" aria-label="More">
            <div className="handle" />
            <button type="button" className="more-item" onClick={() => goMore('roster')}>
              <span className="ic">☰</span> Roster <span className="chev">›</span>
            </button>
            <button type="button" className="more-item" onClick={() => goMore('history')}>
              <span className="ic">◷</span> History <span className="chev">›</span>
            </button>
            <button type="button" className="more-item" onClick={() => goMore('settings')}>
              <span className="ic">⚙</span> Settings <span className="chev">›</span>
            </button>
          </div>
        </>
      ) : null}

      <nav className="tabbar" aria-label="Primary">
        <button
          type="button"
          className={`tab${tab === 'overview' && !moreOpen ? ' on' : ''}`}
          onClick={() => {
            setMoreOpen(false)
            setTab('overview')
          }}
        >
          <span className="tic">▦</span>
          Overview
        </button>
        <button
          type="button"
          className={`tab${tab === 'checklist' && !moreOpen ? ' on' : ''}`}
          onClick={() => {
            setMoreOpen(false)
            setTab('checklist')
          }}
        >
          <span className="tic">
            <CheckMark size={15} />
          </span>
          Checklist
        </button>
        <button
          type="button"
          className={`tab${moreOpen ? ' on' : ''}`}
          onClick={() => (moreOpen ? closeMore() : openMore())}
        >
          <span className="tic">⋯</span>
          More
        </button>
      </nav>
    </div>
  )
}
