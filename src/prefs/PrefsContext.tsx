import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyTheme,
  loadPrefs,
  savePrefs,
  type AppPrefs,
  type ThemeId,
} from './appPrefs'

type PrefsValue = {
  prefs: AppPrefs
  setPref: <K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => void
  setTheme: (theme: ThemeId) => void
}

const PrefsContext = createContext<PrefsValue | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppPrefs>(() => loadPrefs())

  useEffect(() => {
    applyTheme(prefs.theme)
  }, [prefs.theme])

  useEffect(() => {
    savePrefs(prefs)
  }, [prefs])

  const setPref = useCallback(<K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }))
  }, [])

  const setTheme = useCallback((theme: ThemeId) => {
    setPrefs((p) => ({ ...p, theme }))
  }, [])

  const value = useMemo(() => ({ prefs, setPref, setTheme }), [prefs, setPref, setTheme])

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs outside PrefsProvider')
  return ctx
}
