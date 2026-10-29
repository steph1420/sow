import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { onExternalRoute, setRouteHash, useBackLayer, useExitToast } from '../nav/backStack'
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
import { InstallNudge } from '../pwa/InstallUI'
import { loadPrefSyncState, runPrefsSync } from '../sync/prefsRunner'
import { SharingPage } from '../more/SharingPage'
import { ShareProvider } from '../share/ShareContext'
import { SubjectsPage } from '../more/SubjectsPage'
import { SyncPage } from '../more/SyncPage'
import { ShortcutsSheet } from './ShortcutsSheet'
import { isMod, isTypingTarget } from '../lib/keyboard'
import { topDialog } from '../lib/a11yRuntime'
import { usePrefs } from '../prefs/PrefsContext'
import { ChecklistScreen } from '../screens/ChecklistScreen'
import { OverviewScreen } from '../screens/OverviewScreen'

function mainScroller(): HTMLElement | null {
  const els = [...document.querySelectorAll<HTMLElement>('.app-shell *')]
  let best: HTMLElement | null = null
  for (const el of els) {
    if (el.scrollHeight <= el.clientHeight + 4) continue
    const oy = getComputedStyle(el).overflowY
    if (oy !== 'auto' && oy !== 'scroll') continue
    if (!best || el.clientHeight > best.clientHeight) best = el
  }
  return best
}

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
  // v0.36.0: quiet settings sync on open (only after the first-join choice was made).
  useEffect(() => {
    const st = loadPrefSyncState()
    if (st.enabled && st.chosen && navigator.onLine !== false) void runPrefsSync('auto').catch(() => {})
  }, [])

  useEffect(() => {
    if (boot.classKey) setActiveClassKey(boot.classKey)
  }, [boot, setActiveClassKey])

  // v0.28 Share: chooser → Settings → Sharing (edit a template / create one)
  const [sharingIntent, setSharingIntent] = useState<{ id?: string; create?: boolean } | null>(null)
  const openSharing = useCallback((id?: string, create?: boolean) => {
    setMoreOpen(false)
    setSharingIntent({ id, create })
    setStack(['settings', 'sharing'])
  }, [])
  const [helpOpen, setHelpOpen] = useState(false)
  const wrap = (node: ReactNode) => (
    <ShareProvider onManage={openSharing}>
      {node}
      {helpOpen ? <ShortcutsSheet onClose={() => setHelpOpen(false)} /> : null}
      <InstallNudge />
    </ShareProvider>
  )

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
  useEffect(
    () =>
      onExternalRoute((hash) => {
        const r = parseRoute(hash)
        setMoreOpen(false)
        if (r.classKey) setActiveClassKey(r.classKey)
        setStack(r.stack)
        setTab(r.tab)
      }),
    [setActiveClassKey],
  )
  useEffect(() => {
    setRouteHash(formatRoute({ tab, classKey: activeClassKey, stack }))
  }, [tab, activeClassKey, stack])
  // ── v0.37.0 global keyboard (Cmd on Mac, Ctrl elsewhere; never Mod+W/T/N/Q) ──
  const { prefs, setTheme } = usePrefs()
  useEffect(() => {
    const onHelp = () => setHelpOpen(true)
    window.addEventListener('sow:shortcuts', onHelp)
    return () => window.removeEventListener('sow:shortcuts', onHelp)
  }, [])
  useEffect(() => {
    const TABS = ['overview', 'checklist', 'more'] as const
    const goTab = (t: (typeof TABS)[number]) => {
      setHelpOpen(false)
      if (t === 'more') { setStack([]); setMoreOpen(true); return }
      setMoreOpen(false); setStack([]); setTab(t)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const tgt = e.target as HTMLElement
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && tgt.matches?.('.ov-card .top') && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const tops = [...document.querySelectorAll<HTMLElement>('.ov-card .top')]
        const i = tops.indexOf(tgt)
        const n = tops[Math.max(0, Math.min(tops.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]
        if (n) { e.preventDefault(); n.focus(); n.scrollIntoView({ block: 'nearest' }) }
        return
      }
      const typing = isTypingTarget(e.target as HTMLElement)
      const mod = isMod(e)
      const k = e.key
      // Modifier shortcuts work even while typing.
      if (mod && !e.altKey && !e.shiftKey && /^[1-3]$/.test(k)) { e.preventDefault(); goTab(TABS[Number(k) - 1]!); return }
      if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[1-3]$/.test(e.code)) { e.preventDefault(); goTab(TABS[Number(e.code.slice(5)) - 1]!); return }
      if (mod && !e.altKey && k === ',') { e.preventDefault(); setHelpOpen(false); setMoreOpen(false); setStack(['settings']); return }
      if (mod && !e.altKey && !e.shiftKey && (k === 's' || k === 'S')) {
        e.preventDefault(); setHelpOpen(false); setMoreOpen(false); setStack(['settings', 'sync'])
        let tries = 0
        const fire = () => {
          const b = document.querySelector<HTMLButtonElement>('[data-sync-now]')
          if (b && !b.disabled) b.click()
          else if (tries++ < 20) window.setTimeout(fire, 100)
        }
        window.setTimeout(fire, 50)
        return
      }
      if (mod && e.shiftKey && !e.altKey && (k === 'l' || k === 'L')) { e.preventDefault(); setTheme(prefs.theme === 'day' ? 'night' : 'day'); return }
      if (typing) return
      if (e.altKey && !e.ctrlKey && !e.metaKey && k === 'ArrowLeft') { e.preventDefault(); if (canGoBack()) window.history.back(); return }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (k === '?') { e.preventDefault(); setHelpOpen((v) => !v); return }
      if (topDialog()) return
      if (k === 'Backspace') { e.preventDefault(); if (canGoBack()) window.history.back(); return }
      if ((k === '[' || k === ']') && !stackRef.current.length) {
        e.preventDefault()
        const cur = moreRef.current ? 2 : tabRef.current === 'checklist' ? 1 : 0
        goTab(TABS[(cur + (k === ']' ? 1 : 2)) % 3]!)
        return
      }
      // Page scroll outside the checklist grid (grid cells handle their own keys).
      if (['PageDown', 'PageUp', 'Home', 'End', ' '].includes(k)) {
        const t = e.target as HTMLElement
        if (t.closest('button, a, [role="checkbox"], [role="slider"], [role="switch"], input, select, textarea')) return
        const sc = mainScroller()
        if (!sc) return
        e.preventDefault()
        const page = sc.clientHeight * 0.85
        const top = k === 'Home' ? 0 : k === 'End' ? sc.scrollHeight
          : sc.scrollTop + ((k === 'PageUp' || (k === ' ' && e.shiftKey)) ? -page : page)
        sc.scrollTo({ top, behavior: prefs['chrome.reduceMotion'] ? 'auto' : 'smooth' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prefs, setTheme])
  // Dogfood (t66u): never drop focus to <body> after a screen change — land somewhere useful.
  useEffect(() => {
    let raf2 = 0
    // t71u: only when the last input was the keyboard — never on load, touch or pointer.
    if (document.documentElement.dataset.input !== 'kbd') return
    const raf = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => {
      const a = document.activeElement
      if (a && a !== document.body && document.contains(a) && !a.closest('.tabbar')) return
      const pick = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find((el) => el.getClientRects().length)
      const target = moreOpen ? pick('.more-pop .more-item')
        : !topRoute(stack) && tab === 'checklist' ? pick('[data-cell][tabindex="0"]')
        : !topRoute(stack) ? pick('.ov-card.exp .top') ?? pick('.ov-card .top')
        : pick('.app-shell button:not(.tabbar *), .app-shell [tabindex="0"]')
      target?.focus({ preventScroll: false })
    }) })
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(raf2) }
  }, [tab, stack, moreOpen])
  const stackRef = useRef(stack); stackRef.current = stack
  const tabRef = useRef(tab); tabRef.current = tab
  const moreRef = useRef(moreOpen); moreRef.current = moreOpen
  const canGoBack = () => stackRef.current.length > 0 || moreRef.current || tabRef.current === 'checklist'

  const exitToast = useExitToast()
  const toast = exitToast ? (
    <div className="exit-toast" role="status" aria-live="polite">
      Press back again to exit
    </div>
  ) : null

  const top = topRoute(stack)

  if (top) {
    if (top === 'roster') {
      return wrap(
        <div className="app-shell">
          <RosterPage onBack={onBack} />
          {toast}
        </div>
      )
    }
    if (top === 'history') {
      return wrap(
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
      return wrap(
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
            onOpenSharing={() => {
              setSharingIntent(null)
              setStack((s) => pushRoute(s, 'sharing'))
            }}
          />
          {toast}
        </div>
      )
    }
    if (top === 'dev') {
      return wrap(
        <div className="app-shell">
          <DevPage onBack={onBack} />
          {toast}
        </div>
      )
    }
    if (top === 'sync') {
      return wrap(
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
      return wrap(
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
      return wrap(
        <div className="app-shell">
          <SubjectsPage onBack={onBack} />
          {toast}
        </div>
      )
    }
    if (top === 'sharing') {
      return wrap(
        <div className="app-shell">
          <SharingPage
            onBack={onBack}
            initialId={sharingIntent?.id}
            createOnOpen={sharingIntent?.create}
            onConsumedIntent={() => setSharingIntent(null)}
          />
          {toast}
        </div>
      )
    }
    if (top === 'about') {
      return wrap(
        <div className="app-shell">
          <AboutPage onBack={onBack} />
          {toast}
        </div>
      )
    }
  }

  return wrap(
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

      <nav className="tabbar" aria-label="Primary" aria-keyshortcuts="Alt+1 Alt+2 Alt+3">
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
