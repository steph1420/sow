import { useCallback, useMemo } from 'react'
import { usePrefs } from '../prefs/PrefsContext'
import type { ShareState } from './shareTemplates'

/** Share slice of app prefs as a ShareState + an atomic setter. */
export function useShareState(): [ShareState, (fn: (s: ShareState) => ShareState) => void] {
  const { prefs, patchPrefs } = usePrefs()
  const state = useMemo<ShareState>(
    () => ({
      templates: prefs['share.templates'],
      defaultId: prefs['share.defaultId'],
      lastUsedId: prefs['share.lastUsedId'],
      includeClassPrefix: prefs['share.includeClassPrefix'],
    }),
    [prefs],
  )
  const update = useCallback(
    (fn: (s: ShareState) => ShareState) =>
      patchPrefs((p) => {
        const cur: ShareState = {
          templates: p['share.templates'],
          defaultId: p['share.defaultId'],
          lastUsedId: p['share.lastUsedId'],
          includeClassPrefix: p['share.includeClassPrefix'],
        }
        const n = fn(cur)
        return {
          'share.templates': n.templates,
          'share.defaultId': n.defaultId,
          'share.lastUsedId': n.lastUsedId,
          'share.includeClassPrefix': n.includeClassPrefix,
        }
      }),
    [patchPrefs],
  )
  return [state, update]
}
