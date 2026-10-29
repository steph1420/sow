import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installBackStack } from './nav/backStack'
import { installUpdateFlow } from './pwa/updateFlow'
import { captureInstallPrompt } from './pwa/install'
import { installDialogFocus, installInputModality, installWideScale } from './lib/a11yRuntime'
import './styles/tokens.css'
import './styles/shell.css'

installBackStack()
captureInstallPrompt()
installInputModality()
installDialogFocus()
installWideScale()

// v0.30.1 (t4u): register the SW ourselves so a resumed Android PWA checks for and moves onto new builds.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((reg) => {
        installUpdateFlow({
          doc: document,
          win: window,
          sw: navigator.serviceWorker,
          update: () => reg.update(),
          reload: () => window.location.reload(),
          flush: () => window.dispatchEvent(new Event('sow:flush')),
          hadController,
        })
      })
      .catch(() => {
        /* SW unsupported / blocked — app still works online */
      })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
