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
  resolveTheme,
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
    applyTheme(resolveTheme(prefs))
    document.documentElement.dataset.reduceMotion = prefs['chrome.reduceMotion']
      ? '1'
      : '0'
  }, [prefs])

  useEffect(() => {
    if (!prefs['theme.followSystem']) return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyTheme(resolveTheme(prefs))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [prefs])

  useEffect(() => {
    savePrefs(prefs)
  }, [prefs])

  const setPref = useCallback(<K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }))
  }, [])

  const setTheme = useCallback((theme: ThemeId) => {
    setPrefs((p) => ({ ...p, theme, 'theme.followSystem': false }))
  }, [])

  const value = useMemo(() => ({ prefs, setPref, setTheme }), [prefs, setPref, setTheme])

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs outside PrefsProvider')
  return ctx
}
