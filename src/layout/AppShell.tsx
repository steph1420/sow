import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSettings, putSettings } from '../db'

const titles: Record<string, string> = {
  '/': 'Home',
  '/session': 'Session',
  '/mark': 'Mark',
  '/roster': 'Roster',
  '/history': 'History',
  '/settings': 'Settings',
}

export default function AppShell() {
  const { pathname } = useLocation()
  const [theme, setTheme] = useState<'night' | 'day'>('night')

  useEffect(() => {
    ;(async () => {
      const s = await getSettings()
      const t = s.theme === 'day' ? 'day' : 'night'
      setTheme(t)
      document.documentElement.setAttribute('data-theme', t)
    })()
    const onTheme = (e: Event) => {
      const t = (e as CustomEvent<'night' | 'day'>).detail
      setTheme(t)
      document.documentElement.setAttribute('data-theme', t)
    }
    window.addEventListener('sow-theme', onTheme)
    return () => window.removeEventListener('sow-theme', onTheme)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  async function toggleTheme() {
    const next = theme === 'night' ? 'day' : 'night'
    setTheme(next)
    await putSettings({ theme: next })
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>{titles[pathname] ?? 'SoW'}</h1>
          <div className="muted">Setting of Work · v0.5.0</div>
        </div>
        <button type="button" className="theme-toggle" onClick={() => void toggleTheme()}>
          {theme === 'night' ? 'Day' : 'Night'}
        </button>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <nav className="nav" aria-label="Main">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="ico">⌂</span>Home
        </NavLink>
        <NavLink to="/session" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="ico">◫</span>Session
        </NavLink>
        <NavLink to="/mark" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="ico">✓</span>Mark
        </NavLink>
        <NavLink to="/roster" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="ico">☰</span>Roster
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="ico">⚙</span>More
        </NavLink>
      </nav>
    </div>
  )
}
