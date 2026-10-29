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
import { setHapticsLevel } from '../lib/haptics'
import { applyPalette } from '../theme/palettes'
import { getSettings, putSettings } from '../data/api'

type PrefsValue = {
  prefs: AppPrefs
  setPref: <K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => void
  setTheme: (theme: ThemeId) => void
  /** v0.35.0 colour theme id; persisted in IndexedDB settings. */
  palette: string
  setPalette: (id: string) => void
  /** Atomic multi-key update (Share CRUD touches templates + default + lastUsed together). */
  patchPrefs: (patch: Partial<AppPrefs> | ((p: AppPrefs) => Partial<AppPrefs>)) => void
}

const PrefsContext = createContext<PrefsValue | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppPrefs>(() => loadPrefs())

  const [palette, setPaletteState] = useState<string>('default')
  useEffect(() => {
    let live = true
    void getSettings().then((s) => { if (live && s.palette) setPaletteState(s.palette) }).catch(() => {})
    return () => { live = false }
  }, [])
  const setPalette = useCallback((id: string) => {
    setPaletteState(id)
    void putSettings({ palette: id })
  }, [])

  useEffect(() => {
    applyTheme(resolveTheme(prefs))
    applyPalette(palette, resolveTheme(prefs))
    setHapticsLevel(prefs['haptics.level'])
    document.documentElement.dataset.reduceMotion = prefs['chrome.reduceMotion']
      ? '1'
      : '0'
  }, [prefs, palette])

  useEffect(() => {
    if (!prefs['theme.followSystem']) return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => { applyTheme(resolveTheme(prefs)); applyPalette(palette, resolveTheme(prefs)) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [prefs, palette])

  useEffect(() => {
    savePrefs(prefs)
  }, [prefs])

  const setPref = useCallback(<K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }))
  }, [])

  const setTheme = useCallback((theme: ThemeId) => {
    setPrefs((p) => ({ ...p, theme, 'theme.followSystem': false }))
  }, [])

  const patchPrefs = useCallback((patch: Partial<AppPrefs> | ((p: AppPrefs) => Partial<AppPrefs>)) => {
    setPrefs((p) => ({ ...p, ...(typeof patch === 'function' ? patch(p) : patch) }))
  }, [])

  const value = useMemo(() => ({ prefs, setPref, setTheme, palette, setPalette, patchPrefs }), [prefs, setPref, setTheme, palette, setPalette, patchPrefs])

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs outside PrefsProvider')
  return ctx
}
