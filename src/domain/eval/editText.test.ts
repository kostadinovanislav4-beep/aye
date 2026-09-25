import { describe, expect, it } from 'vitest'
import { editTextSchema } from '../content/schema'
import { diffText, evaluateEditText } from './editText'

// Примерът от content/README.md.
const item = editTextSchema.parse({
  id: 'bel-redaktirane-001',
  type: 'edit_text',
  exam: 'bel',
  tags: ['bel.redaktirane'],
  difficulty: 2,
  prompt: 'Намерете и поправете грешките в текста.',
  text: 'Вчера срещнах приятелят си, когото не бях виждал от години. Той ми разказа че е записал медицина.',
  errors: [
    { fragment: 'приятелят', accepted: ['приятеля'], tag: 'bel.gram.chlen' },
    { fragment: 'разказа че', accepted: ['разказа, че'], tag: 'bel.punct.podchineni' },
  ],
  explanation: 'Пълен член вместо кратък и липсваща запетая.',
  verified: false,
})

const FIXED =
  'Вчера срещнах приятеля си, когото не бях виждал от години. Той ми разказа, че е записал медицина.'

describe('diffText', () => {
  it('намира замяна, вмъкване и изтриване', () => {
    expect(diffText('разказа че', 'разказа, че')).toEqual([{ start: 7, end: 7, replacement: ',' }])
    expect(diffText('видях приятелят', 'видях приятеля')).toEqual([
      { start: 6, end: 15, replacement: 'приятеля' },
    ])
    expect(diffText('много много хубаво', 'много хубаво')).toEqual([
      { start: 6, end: 12, replacement: '' },
    ])
    expect(diffText('същият текст', 'същият текст')).toEqual([])
  })
})

describe('evaluateEditText', () => {
  it('дава точка за всяка поправена грешка', () => {
    const result = evaluateEditText(item, { text: FIXED })
    expect(result).toMatchObject({ score: 2, max: 2, correct: true, notes: [] })
    expect(result.parts.map((part) => part.key)).toEqual(['e1', 'e2'])
  })

  it('брои частично поправения текст', () => {
    const result = evaluateEditText(item, { text: FIXED.replace('приятеля', 'приятелят') })
    expect(result.score).toBe(1)
    expect(result.parts.map((part) => part.correct)).toEqual([false, true])
  })

  it('непроменен текст е 0 точки', () => {
    expect(evaluateEditText(item, { text: item.text }).score).toBe(0)
  })

  it('грешна поправка не се брои и показва написаното', () => {
    const result = evaluateEditText(item, { text: FIXED.replace('приятеля', 'приятелът') })
    expect(result.parts[0]).toMatchObject({ correct: false, given: 'приятелът' })
  })

  it('отчита излишните промени, но не и интервалите', () => {
    const extra = evaluateEditText(item, { text: FIXED.replace('медицина', 'право') })
    expect(extra.score).toBe(2)
    expect(extra.notes).toEqual(['Има 1 излишна промяна извън грешките.'])

    const spaces = evaluateEditText(item, { text: FIXED.replace('Той ми', 'Той  ми') })
    expect(spaces.notes).toEqual([])
  })

  it('приема прави и български кавички еднакво', () => {
    const quotes = editTextSchema.parse({
      ...item,
      text: 'Прочетох романа Под игото.',
      errors: [{ fragment: 'Под игото', accepted: ['„Под игото“'], tag: 'bel.punct.kavichki' }],
    })
    expect(evaluateEditText(quotes, { text: 'Прочетох романа "Под игото".' }).score).toBe(1)
    expect(evaluateEditText(quotes, { text: 'Прочетох романа „Под игото“.' }).score).toBe(1)
  })

  it('разпознава слято и полуслято писане', () => {
    const hyphen = editTextSchema.parse({
      ...item,
      text: 'Днес е по добре.',
      errors: [
        { fragment: 'по добре', accepted: ['по-добре'], tag: 'bel.pravopis.slyato-razdelno' },
      ],
    })
    expect(evaluateEditText(hyphen, { text: 'Днес е по-добре.' }).score).toBe(1)
  })

  it('една промяна, която засяга две грешки, се приема само ако дава приет вариант', () => {
    const pair = editTextSchema.parse({
      ...item,
      text: 'аа бб вв',
      errors: [
        { fragment: 'аа', accepted: ['АА'], tag: 'bel.pravopis' },
        { fragment: 'бб', accepted: ['ББ'], tag: 'bel.pravopis' },
      ],
    })
    expect(evaluateEditText(pair, { text: 'АА ББ вв' }).score).toBe(2)
    expect(evaluateEditText(pair, { text: 'АА-ББ вв' }).score).toBe(0)
  })
})
