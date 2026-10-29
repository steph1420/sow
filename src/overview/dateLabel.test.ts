import { describe, expect, it } from 'vitest'
import { sessionDateLabel } from './dateLabel'

describe('sessionDateLabel (t79u/t81u)', () => {
  const today = '2026-10-30'
  it('future → Upcoming', () => expect(sessionDateLabel('2026-11-02', today)).toBe('Upcoming'))
  it('today → Today', () => expect(sessionDateLabel('2026-10-30', today)).toBe('Today'))
  it('past → Latest (not upcoming)', () => expect(sessionDateLabel('2026-10-28', today)).toBe('Latest'))
  it('bad date → empty', () => expect(sessionDateLabel('', today)).toBe(''))
})
