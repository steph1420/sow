/** Copy text: async Clipboard API → hidden textarea + execCommand fallback (http / denied / old WebView). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  return legacyCopy(text)
}

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.top = '-1000px'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  const prev = document.activeElement as HTMLElement | null
  ta.focus()
  ta.select()
  ta.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(ta)
  prev?.focus?.()
  return ok
}

/** Open WhatsApp's chat picker. `noopener` would make window.open return null, so null the opener by hand. */
export function openExternal(url: string): void {
  const w = window.open(url, '_blank')
  if (w) {
    try {
      w.opener = null
    } catch {
      /* cross-origin */
    }
  } else {
    window.location.href = url
  }
}
