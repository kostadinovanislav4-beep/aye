import { describe, expect, it } from 'vitest'
import { normalizeAnswer } from './normalize'

// Специалните знаци са записани с кодовете си: U+2019 е апостроф, U+301 и U+300 са знаци
// за ударение, U+45D е „ѝ“ като една буква.
describe('normalizeAnswer', () => {
  it('пренебрегва регистъра, излишните интервали и пунктуацията', () => {
    expect(normalizeAnswer('  Два   Стола. ')).toBe('два стола')
  })

  it('запазва пунктуацията при keepPunctuation, но маха интервала пред нея', () => {
    expect(normalizeAnswer('Мисля , че си прав.', { keepPunctuation: true })).toBe(
      'мисля, че си прав.',
    )
  })

  it('запазва регистъра при caseSensitive', () => {
    expect(normalizeAnswer('Ботев', { caseSensitive: true })).toBe('Ботев')
  })

  it('уеднаквява апострофите', () => {
    expect(normalizeAnswer('don\u{2019}t')).toBe(normalizeAnswer("don't"))
  })

  it('маха знаците за ударение', () => {
    expect(normalizeAnswer('пра\u{301}вя')).toBe('правя')
  })

  it('различава „ѝ“ от „и“, дори когато „ѝ“ е записано с отделен знак', () => {
    expect(normalizeAnswer('\u{45D}')).not.toBe(normalizeAnswer('и'))
    expect(normalizeAnswer('и\u{300}')).toBe(normalizeAnswer('\u{45D}'))
  })

  it('приема тире и интервал за едно и също, когато пунктуацията се пренебрегва', () => {
    expect(normalizeAnswer('well-known')).toBe(normalizeAnswer('well known'))
  })
})
