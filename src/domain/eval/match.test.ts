import { describe, expect, it } from 'vitest'
import { containsPhrase, isAccepted } from './match'

describe('isAccepted', () => {
  it('приема всеки от приетите отговори без значение от регистъра и пунктуацията', () => {
    expect(isAccepted('  Два  Стола. ', ['стола', 'два стола'])).toBe(true)
    expect(isAccepted('стола', ['стола', 'два стола'])).toBe(true)
    expect(isAccepted('столове', ['стола', 'два стола'])).toBe(false)
  })

  it('не приема празен отговор', () => {
    expect(isAccepted('   ', ['стола'])).toBe(false)
    expect(isAccepted('...', ['стола'])).toBe(false)
  })

  it('пази запетаите при keepPunctuation и регистъра при caseSensitive', () => {
    const rules = { keepPunctuation: true }
    expect(isAccepted('Мисля, че си прав.', ['Мисля, че си прав.'], rules)).toBe(true)
    expect(isAccepted('Мисля че си прав.', ['Мисля, че си прав.'], rules)).toBe(false)
    expect(isAccepted('ботев', ['Ботев'], { caseSensitive: true })).toBe(false)
    expect(isAccepted('Ботев', ['Ботев'], { caseSensitive: true })).toBe(true)
  })

  it('прилага регулярния израз към целия нормализиран отговор', () => {
    const rules = { pattern: '(?:в )?1 октомври' }
    expect(isAccepted('В 1 октомври.', ['от 1 октомври'], rules)).toBe(true)
    expect(isAccepted('около 1 октомври', ['от 1 октомври'], rules)).toBe(false)
    expect(isAccepted('x', ['y'], { pattern: '(' })).toBe(false)
  })
})

describe('containsPhrase', () => {
  it('търси цели думи', () => {
    expect(containsPhrase('the castle is said to have', 'is said')).toBe(true)
    expect(containsPhrase('this said', 'is said')).toBe(false)
    expect(containsPhrase('anything', '')).toBe(false)
  })
})
