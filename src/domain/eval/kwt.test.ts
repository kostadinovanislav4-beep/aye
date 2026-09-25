import { describe, expect, it } from 'vitest'
import { kwtSchema } from '../content/schema'
import { evaluateKwt } from './kwt'

// Примерът от content/README.md.
const item = kwtSchema.parse({
  id: 'cae-uoe-part4-001',
  type: 'kwt',
  exam: 'cae',
  tags: ['cae.uoe.part4'],
  difficulty: 3,
  sentence: 'People say that the castle was built in the 12th century.',
  keyword: 'SAID',
  gapped: 'The castle [[1]] been built in the 12th century.',
  answers: ['is said to have'],
  parts: [{ accepted: ['is said'] }, { accepted: ['to have'] }],
  explanation: 'Passive with reporting verbs.',
  verified: false,
})

const score = (text: string) => evaluateKwt(item, { text }).score

describe('evaluateKwt', () => {
  it('дава 2 точки за пълен приет отговор, без значение от регистъра', () => {
    expect(score('is said to have')).toBe(2)
    expect(score('Is SAID to have')).toBe(2)
  })

  it('приема и цялото изречение, ако е написано', () => {
    expect(score('The castle is said to have been built in the 12th century.')).toBe(2)
  })

  it('дава 1 точка за вярна част', () => {
    expect(score('is said to had')).toBe(1)
    expect(score('was said to have')).toBe(1)
  })

  it('не дава 2 точки за разбъркан отговор с двете части', () => {
    expect(score('to have is said')).toBe(1)
  })

  it('дава 0 точки без ключовата дума или над 6 думи и казва защо', () => {
    const noKeyword = evaluateKwt(item, { text: 'is thought to have' })
    expect(noKeyword.score).toBe(0)
    expect(noKeyword.notes).toEqual(['Липсва ключовата дума „SAID“ или е променена.'])

    const long = evaluateKwt(item, { text: "is said by many people to've" })
    expect(long.score).toBe(0)
    expect(long.notes).toEqual(['Отговорът е от 7 думи, а са разрешени най-много 6.'])
  })

  it('отбелязва твърде кратък отговор', () => {
    const short = evaluateKwt(item, { text: 'said' })
    expect(short.score).toBe(0)
    expect(short.notes).toEqual(['Отговорът е от 1 дума, а трябва да е поне 3.'])
    expect(evaluateKwt(item, { text: '' })).toMatchObject({ score: 0, max: 2, notes: [] })
  })
})
