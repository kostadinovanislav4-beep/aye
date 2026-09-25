import { describe, expect, it } from 'vitest'
import { splitCloze } from '../content/markers'
import type { CardRecord } from '../progress/types'
import { countCards, remainingToday } from './overview'

const record = (id: string, state: CardRecord['state']): CardRecord => ({
  id,
  due: 0,
  stability: 1,
  difficulty: 5,
  scheduledDays: 1,
  learningSteps: 0,
  reps: 1,
  lapses: 0,
  state,
  lastReview: 0,
  updatedAt: 0,
})

describe('countCards и remainingToday', () => {
  it('брои новите, за преговор и в учене', () => {
    const counts = countCards(
      ['a', 'b', 'c', 'd', 'e'],
      new Set(['b', 'c', 'd']),
      new Map([
        ['b', record('b', 2)],
        ['c', record('c', 3)],
      ]),
    )
    expect(counts).toEqual({ total: 5, new: 2, due: 1, learning: 1 })
    expect(
      remainingToday(counts, { newPerDay: 20, reviewsPerDay: 1 }, { newDone: 19, reviewsDone: 1 }),
    ).toEqual({ new: 1, reviews: 0, learning: 1 })
  })
})

describe('splitCloze', () => {
  it('разделя текста на обикновен текст и изтривания', () => {
    expect(splitCloze('{{c2::Ботев}} е роден в {{c1::Калофер::град}}.')).toEqual([
      { index: 2, answer: 'Ботев' },
      { text: ' е роден в ' },
      { index: 1, answer: 'Калофер', hint: 'град' },
      { text: '.' },
    ])
  })
})
