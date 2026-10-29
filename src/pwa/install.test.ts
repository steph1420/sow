import { beforeEach, describe, expect, it } from 'vitest'
import { installMode, isStandalone, shouldNudge, markNudgeSeen, NUDGE_KEY } from './install'

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IOS_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'
const FF = 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0'

const mem = new Map<string, string>()
beforeEach(() => {
  mem.clear()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) }, removeItem: (k: string) => { mem.delete(k) } } })
})

describe('v0.35.1 Install as app (t52u)', () => {
  it('prompt where beforeinstallprompt fired', () => {
    expect(installMode({ ua: ANDROID, standalone: false, hasPrompt: true })).toBe('prompt')
  })
  it('iOS Safari gets the steps sheet; iOS Chrome too (Share › Add to Home Screen works there)', () => {
    expect(installMode({ ua: IOS, standalone: false, hasPrompt: false })).toBe('ios')
    expect(installMode({ ua: IOS_CHROME, standalone: false, hasPrompt: false })).toBe('ios')
  })
  it('hidden when standalone or no install path', () => {
    expect(installMode({ ua: ANDROID, standalone: true, hasPrompt: true })).toBe('none')
    expect(installMode({ ua: IOS, standalone: true, hasPrompt: false })).toBe('none')
    expect(installMode({ ua: FF, standalone: false, hasPrompt: false })).toBe('none')
  })
  it('isStandalone reads display-mode and navigator.standalone', () => {
    expect(isStandalone({ matchMedia: () => ({ matches: true }) } as never, {} as never)).toBe(true)
    expect(isStandalone({ matchMedia: () => ({ matches: false }) } as never, { standalone: true } as never)).toBe(true)
    expect(isStandalone({ matchMedia: () => ({ matches: false }) } as never, {} as never)).toBe(false)
  })
  it('nudge shows once, never again', () => {
    expect(shouldNudge('ios')).toBe(true)
    expect(shouldNudge('none')).toBe(false)
    markNudgeSeen()
    expect(mem.get(NUDGE_KEY)).toBeTruthy()
    expect(shouldNudge('ios')).toBe(false)
    expect(shouldNudge('prompt')).toBe(false)
  })
})
