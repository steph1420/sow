import { useEffect, useState, type ReactNode } from 'react'
import { seedIfEmpty } from './data'
import { WorkspaceProvider, useWorkspace } from './demo/WorkspaceContext'
import { PrefsProvider } from './prefs/PrefsContext'
import { AppShell } from './shell/AppShell'

function BootGate({ children }: { children: ReactNode }) {
  const { ready } = useWorkspace()
  if (!ready) {
    return (
      <div
        style={{
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-ter)',
          fontSize: 13,
        }}
      >
        Starting…
      </div>
    )
  }
  return children
}

export default function App() {
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await seedIfEmpty()
      } finally {
        if (!cancelled) setSeeded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!seeded) {
    return (
      <div
        style={{
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-ter)',
          fontSize: 13,
        }}
      >
        Starting…
      </div>
    )
  }

  return (
    <PrefsProvider>
      <WorkspaceProvider>
        <BootGate>
          <AppShell />
        </BootGate>
      </WorkspaceProvider>
    </PrefsProvider>
  )
}
