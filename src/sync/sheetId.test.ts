import { describe, expect, it } from 'vitest'
import { extractSheetId } from './sheetId'

describe('extractSheetId', () => {
  it('parses docs URL', () => {
    expect(
      extractSheetId(
        'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcd/edit',
      ),
    ).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcd')
  })
})
