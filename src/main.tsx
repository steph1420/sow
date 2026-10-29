import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installBackStack } from './nav/backStack'
import './styles/tokens.css'
import './styles/shell.css'

installBackStack()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
