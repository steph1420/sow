import { describe, expect, it } from 'vitest'
import { popRoute, pushRoute, topRoute } from './navStack'

describe('more navStack', () => {
  it('push settings then dev; pop returns to settings only', () => {
    let s = pushRoute([], 'settings')
    expect(topRoute(s)).toBe('settings')
    s = pushRoute(s, 'dev')
    expect(s).toEqual(['settings', 'dev'])
    s = popRoute(s)
    expect(s).toEqual(['settings'])
    s = popRoute(s)
    expect(s).toEqual([])
    expect(topRoute(s)).toBe(null)
  })

  it('pop on empty is safe', () => {
    expect(popRoute([])).toEqual([])
  })
})
