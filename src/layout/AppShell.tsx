import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSettings, putSettings } from '../db'
import OfflineBanner from '../components/OfflineBanner'
import InstallPrompt from '../components/InstallPrompt'
import { applyAppearanceAttrs, subscribePrefs } from '../lib/sowPrefs'

const titles: Record<string, string> = {
  '/checklist': 'Checklist',
  '/overview': 'Overview',
  '/roster': 'Roster',
  '/history': 'History',
  '/settings': 'Settings',
  '/mark': 'Checklist',
}

const MORE_PATHS = new Set(['/roster', '/history', '/settings'])

function applyThemeMeta(theme: 'night' | 'day') {
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'day' ? '#f2f3f5' : '#0b0c10')
  applyAppearanceAttrs(undefined, theme)
}

export default function AppShell() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const [theme, setTheme] = useState<'night' | 'day'>('night')
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      const s = await getSettings()
      const t = s.theme === 'day' ? 'day' : 'night'
      setTheme(t)
      applyThemeMeta(t)
    })()
    const onTheme = (e: Event) => {
      const t = (e as CustomEvent<'night' | 'day'>).detail
      setTheme(t)
      applyThemeMeta(t)
    }
    window.addEventListener('sow-theme', onTheme)
    return () => window.removeEventListener('sow-theme', onTheme)
  }, [])

  useEffect(() => {
    applyThemeMeta(theme)
  }, [theme])

  useEffect(() => {
    applyAppearanceAttrs(undefined, theme)
    return subscribePrefs(() => applyAppearanceAttrs(undefined, theme))
  }, [theme])

  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

  async function toggleTheme() {
    const next = theme === 'night' ? 'day' : 'night'
    setTheme(next)
    await putSettings({ theme: next })
  }

  function goMore(path: string) {
    setMoreOpen(false)
    nav(path)
  }

  const moreActive = moreOpen || MORE_PATHS.has(pathname)

  return (
    <div className="app">
      <OfflineBanner />
      <header className="top">
        <div>
          <h1>{titles[pathname] ?? 'SoW'}</h1>
          <div className="muted">Setting of Work · v0.12.0</div>
        </div>
        <button type="button" className="theme-toggle" onClick={() => void toggleTheme()}>
          {theme === 'night' ? 'Day' : 'Night'}
        </button>
      </header>
      <InstallPrompt />
      <main className="main">
        <Outlet />
      </main>
      <nav className="nav" aria-label="Main">
        <NavLink
          to="/checklist"
          className={({ isActive }) => (isActive ? 'active' : '')}
          onClick={() => setMoreOpen(false)}
        >
          <span className="ico" aria-hidden>
            ✓
          </span>
          Checklist
        </NavLink>
        <NavLink
          to="/overview"
          className={({ isActive }) => (isActive ? 'active' : '')}
          onClick={() => setMoreOpen(false)}
        >
          <span className="ico" aria-hidden>
            ▦
          </span>
          Overview
        </NavLink>
        <button
          type="button"
          className={moreActive ? 'active' : ''}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((o) => !o)}
        >
          <span className="ico" aria-hidden>
            ⋯
          </span>
          More
        </button>
      </nav>
      {moreOpen ? (
        <div className="more-layer" role="presentation">
          <button
            type="button"
            className="more-scrim"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div className="more-popup" role="menu" aria-label="More">
            <button type="button" role="menuitem" onClick={() => goMore('/roster')}>
              <span className="more-ico" aria-hidden>
                ☰
              </span>
              Roster
            </button>
            <button type="button" role="menuitem" onClick={() => goMore('/history')}>
              <span className="more-ico" aria-hidden>
                ◷
              </span>
              History
            </button>
            <button type="button" role="menuitem" onClick={() => goMore('/settings')}>
              <span className="more-ico" aria-hidden>
                ⚙
              </span>
              Settings
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
