import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

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
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>{titles[pathname] ?? 'SoW'}</h1>
          <div className="muted">Setting of Work · v0.3.0</div>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((t) => (t === 'night' ? 'day' : 'night'))}
        >
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
