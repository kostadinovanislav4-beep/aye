import { describe, expect, it } from 'vitest'
import type { CardRecord } from '../progress/types'
import {
  LEARN_AHEAD_MS,
  buildCramQueue,
  buildDailyQueue,
  countDoneToday,
  interleave,
  learningDue,
  nextStep,
  requeueAfterAgain,
} from './queue'

const local = (d: number, h: number, min = 0) => new Date(2026, 8, d, h, min).getTime()
const NOW = local(25, 10)
const MINUTE = 60_000

function card(id: string, state: CardRecord['state'], due: number): CardRecord {
  return {
    id,
    due,
    stability: 5,
    difficulty: 5,
    scheduledDays: 3,
    learningSteps: 0,
    reps: 3,
    lapses: 0,
    state,
    lastReview: due - 3 * 24 * 60 * MINUTE,
    updatedAt: due - 3 * 24 * 60 * MINUTE,
  }
}

describe('countDoneToday', () => {
  it('брои само оценките в srs от текущия учебен ден', () => {
    const done = countDoneToday(
      [
        { at: local(25, 9), mode: 'srs', stateBefore: 0 },
        { at: local(25, 9, 5), mode: 'srs', stateBefore: 1 },
        { at: local(25, 9, 10), mode: 'srs', stateBefore: 2 },
        { at: local(25, 9, 15), mode: 'cram', stateBefore: 2 },
        // В 3:30 е още предишният учебен ден.
        { at: local(25, 3, 30), mode: 'srs', stateBefore: 0 },
      ],
      NOW,
    )
    expect(done).toEqual({ newDone: 1, reviewsDone: 1 })
  })
})

describe('interleave', () => {
  it('разпределя новите карти равномерно и пази реда', () => {
    expect(interleave(['r1', 'r2', 'r3', 'r4'], ['n1', 'n2'])).toEqual([
      'r1',
      'r2',
      'n1',
      'r3',
      'r4',
      'n2',
    ])
    expect(interleave([], ['n1', 'n2'])).toEqual(['n1', 'n2'])
    expect(interleave(['r1'], [])).toEqual(['r1'])
  })
})

describe('buildDailyQueue', () => {
  const records = new Map<string, CardRecord>([
    ['late', card('late', 2, local(20, 9))],
    ['today', card('today', 2, local(25, 22))],
    // До 4:00 сутринта е още днешният учебен ден.
    ['night', card('night', 2, local(26, 3))],
    ['tomorrow', card('tomorrow', 2, local(26, 12))],
    ['learning', card('learning', 1, NOW + 5 * MINUTE)],
  ])
  const cardIds = ['new1', 'today', 'late', 'night', 'tomorrow', 'learning', 'new2', 'new3']

  it('взима преговорите до края на деня (първо най-старите) и новите по ред', () => {
    const queue = buildDailyQueue({
      now: NOW,
      cardIds,
      records,
      limits: { newPerDay: 20, reviewsPerDay: 200 },
      done: { newDone: 0, reviewsDone: 0 },
    })
    expect(queue.filter((id) => !id.startsWith('new'))).toEqual(['late', 'today', 'night'])
    expect(queue.filter((id) => id.startsWith('new'))).toEqual(['new1', 'new2', 'new3'])
  })

  it('спазва дневните лимити, като брои минатото днес', () => {
    const queue = buildDailyQueue({
      now: NOW,
      cardIds,
      records,
      limits: { newPerDay: 3, reviewsPerDay: 2 },
      done: { newDone: 2, reviewsDone: 1 },
    })
    expect(queue).toEqual(['late', 'new1'])
  })
})

describe('learningDue и nextStep', () => {
  const records = new Map<string, CardRecord>([
    ['soon', card('soon', 1, NOW + 5 * MINUTE)],
    ['now', card('now', 3, NOW - MINUTE)],
    ['later', card('later', 1, NOW + 2 * 60 * MINUTE)],
    ['review', card('review', 2, NOW)],
  ])

  it('връща картите в учене по реда на падежа', () => {
    expect(learningDue(['soon', 'now', 'later', 'review'], records, NOW)).toEqual([
      { id: 'now', due: NOW - MINUTE },
      { id: 'soon', due: NOW + 5 * MINUTE },
      { id: 'later', due: NOW + 2 * 60 * MINUTE },
    ])
  })

  it('първо карта в учене с дошло време, после опашката, после до 20 мин напред', () => {
    const learning = learningDue(['soon', 'now', 'later'], records, NOW)
    expect(nextStep({ now: NOW, queue: ['q1'], position: 0, learning })).toEqual({
      kind: 'card',
      id: 'now',
      fromQueue: false,
    })
    const rest = learning.filter((c) => c.id !== 'now')
    expect(nextStep({ now: NOW, queue: ['q1'], position: 0, learning: rest })).toEqual({
      kind: 'card',
      id: 'q1',
      fromQueue: true,
    })
    expect(nextStep({ now: NOW, queue: ['q1'], position: 1, learning: rest })).toEqual({
      kind: 'card',
      id: 'soon',
      fromQueue: false,
    })
  })

  it('чака по-късна карта в учене и приключва, когато няма нищо', () => {
    const later = [{ id: 'later', due: NOW + LEARN_AHEAD_MS + MINUTE }]
    expect(nextStep({ now: NOW, queue: [], position: 0, learning: later })).toEqual({
      kind: 'wait',
      until: NOW + LEARN_AHEAD_MS + MINUTE,
    })
    expect(nextStep({ now: NOW, queue: [], position: 0, learning: [] })).toEqual({ kind: 'done' })
  })
})

describe('cram', () => {
  it('първо най-слабо помнените, после новите', () => {
    const strength: Record<string, number | null> = { a: 0.9, b: 0.4, c: null, d: 0.7 }
    expect(buildCramQueue(['a', 'b', 'c', 'd'], (id) => strength[id] ?? null)).toEqual([
      'b',
      'd',
      'a',
      'c',
    ])
  })

  it('връща сгрешената карта няколко карти по-късно', () => {
    const queue = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    expect(requeueAfterAgain(queue, 0, 'a')).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'a', 'g', 'h'])
    expect(requeueAfterAgain(['a', 'b'], 1, 'b')).toEqual(['a', 'b', 'b'])
  })
})
