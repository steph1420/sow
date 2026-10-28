import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AppShell from './layout/AppShell'
import MarkPage from './pages/MarkPage'
import ChecklistPage from './pages/checklist/ChecklistPage'
import OverviewPage from './pages/OverviewPage'
import RosterPage from './pages/RosterPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { loadPrefs, subscribePrefs } from './lib/sowPrefs'

/** Keep ?class= (etc.) when renaming Mark → Checklist. */
function RedirectMarkToChecklist() {
  const { search } = useLocation()
  return <Navigate to={`/checklist${search}`} replace />
}

/** Production checklist: MarkPage unless Dev chrome.useRebuild. */
function ChecklistRoute() {
  const [useRebuild, setUseRebuild] = useState(() => loadPrefs()['chrome.useRebuild'])
  useEffect(() => subscribePrefs((p) => setUseRebuild(p['chrome.useRebuild'])), [])
  return useRebuild ? <ChecklistPage /> : <MarkPage />
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/checklist" replace />} />
          <Route path="checklist" element={<ChecklistRoute />} />
          <Route path="checklist-next" element={<ChecklistPage />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="roster" element={<RosterPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="mark" element={<RedirectMarkToChecklist />} />
          <Route path="session" element={<Navigate to="/checklist" replace />} />
          <Route path="*" element={<Navigate to="/checklist" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
