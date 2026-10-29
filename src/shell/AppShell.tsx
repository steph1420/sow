import { useCallback, useEffect, useState } from 'react'
import { setRouteHash, useBackLayer, useExitToast } from '../nav/backStack'
import { formatRoute, parseRoute } from '../nav/route'
import { CheckMark } from '../components/CheckMark'
import type { ClassKey } from '../data/types'
import { useWorkspace } from '../demo/WorkspaceContext'
import { AboutPage } from '../more/AboutPage'
import { AppearancePage } from '../more/AppearancePage'
import { DevPage } from '../more/DevPage'
import { HistoryPage } from '../more/HistoryPage'
import { popRoute, pushRoute, topRoute, type MoreStack } from '../more/navStack'
import { RosterPage } from '../more/RosterPage'
import { SettingsPage } from '../more/SettingsPage'
import { SubjectsPage } from '../more/SubjectsPage'
import { SyncPage } from '../more/SyncPage'
import { ChecklistScreen } from '../screens/ChecklistScreen'
import { OverviewScreen } from '../screens/OverviewScreen'

export type TabId = 'checklist' | 'overview'

/**
 * AppShell — Overview · Checklist · More popup (Portal IA + pretty Settings).
 * Default landing = Overview (Steve t141u). More stays popup (t137u).
 */
export function AppShell() {
  const { activeClassKey, setActiveClassKey } = useWorkspace()
  // P1-1: boot from hash route (reload restores current screen).
  const [boot] = useState(() => parseRoute(window.location.hash, window.location.pathname))
  const [tab, setTab] = useState<TabId>(boot.tab)
  const [moreOpen, setMoreOpen] = useState(false)
  const [stack, setStack] = useState<MoreStack>(boot.stack)
  useEffect(() => {
    if (boot.classKey) setActiveClassKey(boot.classKey)
  }, [boot, setActiveClassKey])

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

  // History sync (t156u): each open layer = one browser back-step, topmost closes first.
  useBackLayer(tab === 'checklist' ? 1 : 0, () => setTab('overview'))
  useBackLayer(stack.length, () => setStack((s) => popRoute(s)))
  useBackLayer(moreOpen ? 1 : 0, () => setMoreOpen(false))
  useEffect(() => {
    setRouteHash(formatRoute({ tab, classKey: activeClassKey, stack }))
  }, [tab, activeClassKey, stack])
  const exitToast = useExitToast()
  const toast = exitToast ? (
    <div className="exit-toast" role="status" aria-live="polite">
      Press back again to exit
    </div>
  ) : null

  const top = topRoute(stack)

  if (top) {
    if (top === 'roster') {
      return (
        <div className="app-shell">
          <RosterPage onBack={onBack} />
          {toast}
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
          {toast}
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
            onOpenAppearance={() => setStack((s) => pushRoute(s, 'appearance'))}
            onOpenSubjects={() => setStack((s) => pushRoute(s, 'subjects'))}
            onOpenRoster={() => setStack((s) => pushRoute(s, 'roster'))}
            onOpenHistory={() => setStack((s) => pushRoute(s, 'history'))}
            onOpenAbout={() => setStack((s) => pushRoute(s, 'about'))}
          />
          {toast}
        </div>
      )
    }
    if (top === 'dev') {
      return (
        <div className="app-shell">
          <DevPage onBack={onBack} />
          {toast}
        </div>
      )
    }
    if (top === 'sync') {
      return (
        <div className="app-shell">
          <SyncPage
            onBack={onBack}
            onOpenSubjects={() => setStack((s) => pushRoute(s, 'subjects'))}
          />
          {toast}
        </div>
      )
    }
    if (top === 'appearance') {
      return (
        <div className="app-shell">
          <AppearancePage
            onBack={onBack}
            onOpenAzDev={() => setStack((s) => pushRoute(s, 'dev'))}
          />
          {toast}
        </div>
      )
    }
    if (top === 'subjects') {
      return (
        <div className="app-shell">
          <SubjectsPage onBack={onBack} />
          {toast}
        </div>
      )
    }
    if (top === 'about') {
      return (
        <div className="app-shell">
          <AboutPage onBack={onBack} />
          {toast}
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
      {toast}
    </div>
  )
}
