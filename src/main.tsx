import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { seedIfEmpty } from './db'
import './styles/app.css'

async function boot() {
  await seedIfEmpty()
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
