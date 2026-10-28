import { describe, expect, it } from 'vitest'
import { extractSheetId } from './sheetId'

describe('extractSheetId', () => {
  it('parses docs URL', () => {
    expect(
      extractSheetId(
        'https://docs.google.com/spreadsheets/d/1SdbZP8dHmNl2xhd9_srt6n-U2gqkQH8Aj7du5B5Mviw/edit',
      ),
    ).toBe('1SdbZP8dHmNl2xhd9_srt6n-U2gqkQH8Aj7du5B5Mviw')
  })
})
