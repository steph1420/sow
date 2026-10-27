import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { getSettings, seedIfEmpty } from './db'
import { applyAppearanceAttrs } from './lib/sowPrefs'
import { runSync } from './sync'
import './styles/app.css'

async function boot() {
  await seedIfEmpty()
  applyAppearanceAttrs()
  window.addEventListener('online', () => {
    void (async () => {
      const s = await getSettings()
      if (s.syncUrl && s.syncDirty) await runSync()
    })()
  })
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

boot().catch((err) => {
  console.error(err)
  document.body.textContent = String(err)
})
