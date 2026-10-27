import { useEffect, useState } from 'react'

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'sow-install-dismissed'

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const [hidden, setHidden] = useState(true)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
    if (standalone) return

    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (isIOS) {
      setIosHint(true)
      setHidden(false)
      return
    }

    const onBip = (e: Event) => {
      e.preventDefault()
      setEvt(e as BIPEvent)
      setHidden(false)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setHidden(true)
  }

  async function install() {
    if (!evt) return
    await evt.prompt()
    await evt.userChoice
    setEvt(null)
    setHidden(true)
  }

  if (hidden) return null

  return (
    <div className="install-bar">
      <p>
        {iosHint
          ? 'Install: Share → Add to Home Screen'
          : 'Install SoW for full-screen marking'}
      </p>
      {!iosHint && evt ? (
        <button type="button" className="install" onClick={() => void install()}>
          Install
        </button>
      ) : null}
      <button type="button" className="dismiss" onClick={dismiss}>
        Not now
      </button>
    </div>
  )
}
