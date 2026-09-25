import { describe, expect, it } from 'vitest'
import { itemSchema } from './schema'

const basic = {
  id: 'cae-vocab-test-001',
  type: 'basic',
  exam: 'cae',
  tags: ['cae.vocab.collocations'],
  difficulty: 2,
  front: 'shed light on something',
  back: 'to help to explain something',
  explanation: 'Устойчиво словосъчетание.',
  verified: false,
}

describe('itemSchema', () => {
  it('приема правилна карта', () => {
    expect(itemSchema.safeParse(basic).success).toBe(true)
  })

  it('не променя съдържанието при проверката', () => {
    const withSpaces = { ...basic, back: '  to help to explain something  ' }
    const parsed = itemSchema.parse(withSpaces)
    expect(parsed).toEqual(withSpaces)
  })

  it('изисква verified изрично', () => {
    const { verified: _omitted, ...withoutVerified } = basic
    expect(itemSchema.safeParse(withoutVerified).success).toBe(false)
  })

  it('отхвърля непознато поле (правописна грешка в името)', () => {
    expect(itemSchema.safeParse({ ...basic, explanaton: 'x' }).success).toBe(false)
  })

  it('отхвърля трудност извън 1–5 и празно обяснение', () => {
    expect(itemSchema.safeParse({ ...basic, difficulty: 6 }).success).toBe(false)
    expect(itemSchema.safeParse({ ...basic, explanation: '   ' }).success).toBe(false)
  })

  it('отхвърля неправилен id и таг', () => {
    expect(itemSchema.safeParse({ ...basic, id: 'Cae_001' }).success).toBe(false)
    expect(itemSchema.safeParse({ ...basic, tags: ['CAE vocab'] }).success).toBe(false)
  })

  it('различава вариантите на text_set по format', () => {
    const matching = {
      id: 'cae-reading-part8-001',
      type: 'text_set',
      format: 'matching',
      exam: 'cae',
      tags: ['cae.reading.part8'],
      difficulty: 3,
      passages: [
        { id: 'A', text: 'First text.' },
        { id: 'B', text: 'Second text.' },
      ],
      questions: [{ kind: 'match', prompt: 'Which writer…?', answer: 'B', explanation: '…' }],
      explanation: 'Multiple matching.',
      verified: false,
    }
    expect(itemSchema.safeParse(matching).success).toBe(true)
    expect(itemSchema.safeParse({ ...matching, format: 'gapped' }).success).toBe(false)
  })
})
