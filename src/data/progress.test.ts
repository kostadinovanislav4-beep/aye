import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { itemSchema } from '../domain/content/schema'
import { evaluateItem } from '../domain/eval/evaluate'
import { openDb, type AyeDb } from './db'
import {
  activityByDay,
  doneToday,
  finishSession,
  rateInSession,
  recordAttempt,
  resumableSession,
  startSession,
  undoLastRating,
} from './progress'

const at = (d: number, h = 10, min = 0) => new Date(2026, 8, d, h, min).getTime()
const NOW = at(25)

let database: AyeDb
beforeEach(() => {
  database = openDb('aye-test', { indexedDB: new IDBFactory(), IDBKeyRange })
})

describe('сесия с флашкарти', () => {
  it('оценката записва дневника, картата и мястото в опашката', async () => {
    const session = await startSession('srs', {}, ['a', 'b'], NOW, database)
    const next = await rateInSession(
      {
        sessionId: session.id,
        cardId: 'a',
        rating: 3,
        now: NOW,
        durationMs: 4000,
        fromQueue: true,
      },
      database,
    )
    expect(next.position).toBe(1)
    expect(next.stats).toEqual({ answered: 1, correct: 1, ratings: [0, 0, 1, 0] })
    expect(await database.cards.get('a')).toMatchObject({ state: 1, reps: 1 })
    expect(await database.reviews.toArray()).toMatchObject([
      { cardId: 'a', rating: 3, mode: 'srs', stateBefore: 0, durationMs: 4000 },
    ])
    expect(await doneToday(NOW + 1000, database)).toEqual({ newDone: 1, reviewsDone: 0 })
  })

  it('undo връща картата, мястото и статистиката', async () => {
    const session = await startSession('srs', {}, ['a', 'b'], NOW, database)
    await rateInSession(
      { sessionId: session.id, cardId: 'a', rating: 3, now: NOW, durationMs: 1, fromQueue: true },
      database,
    )
    const first = await database.cards.get('a')
    const rated = await rateInSession(
      {
        sessionId: session.id,
        cardId: 'a',
        rating: 1,
        now: NOW + 60_000,
        durationMs: 1,
        fromQueue: false,
      },
      database,
    )
    expect(rated.position).toBe(1)

    const undone = await undoLastRating(session.id, NOW + 70_000, database)
    expect(undone).toMatchObject({ position: 1, undo: null })
    expect(undone?.stats).toEqual({ answered: 1, correct: 1, ratings: [0, 0, 1, 0] })
    expect(await database.cards.get('a')).toEqual(first)
    expect(await database.reviews.count()).toBe(1)
  })

  it('undo на нова карта я прави отново нова', async () => {
    const session = await startSession('srs', {}, ['a'], NOW, database)
    await rateInSession(
      { sessionId: session.id, cardId: 'a', rating: 4, now: NOW, durationMs: 1, fromQueue: true },
      database,
    )
    await undoLastRating(session.id, NOW, database)
    expect(await database.cards.get('a')).toBeUndefined()
    expect((await database.sessions.get(session.id))?.position).toBe(0)
  })

  it('cram не мести графика и връща сгрешената карта в опашката', async () => {
    const session = await startSession('cram', { tags: ['bel'] }, ['a', 'b', 'c'], NOW, database)
    const next = await rateInSession(
      { sessionId: session.id, cardId: 'a', rating: 1, now: NOW, durationMs: 1, fromQueue: true },
      database,
    )
    expect(next.queue).toEqual(['a', 'b', 'c', 'a'])
    expect(await database.cards.count()).toBe(0)
    expect((await database.reviews.toArray())[0]?.mode).toBe('cram')

    const undone = await undoLastRating(session.id, NOW, database)
    expect(undone?.queue).toEqual(['a', 'b', 'c'])
  })

  it('незавършената сесия се възстановява само в същия учебен ден', async () => {
    const session = await startSession('srs', {}, ['a'], at(25, 22), database)
    expect((await resumableSession('srs', at(26, 1), database))?.id).toBe(session.id)
    expect(await resumableSession('cram', at(26, 1), database)).toBeNull()
    expect(await resumableSession('srs', at(26, 9), database)).toBeNull()
    expect((await database.sessions.get(session.id))?.status).toBe('done')
  })

  it('нова сесия затваря старата от същия вид', async () => {
    const old = await startSession('srs', {}, ['a'], NOW, database)
    await startSession('srs', {}, ['b'], NOW + 1000, database)
    expect((await database.sessions.get(old.id))?.status).toBe('done')
    const finished = await finishSession(old.id, NOW + 2000, database)
    expect(finished?.endedAt).toBe(NOW + 2000)
  })
})

describe('отговор на задача', () => {
  const item = itemSchema.parse({
    id: 'cae-uoe-part2-001',
    type: 'open_cloze',
    exam: 'cae',
    tags: ['cae.uoe.part2'],
    difficulty: 3,
    text: 'It was not [[1]] later that [[2]] knew.',
    gaps: [
      { accepted: ['until'], explanation: 'Cleft.' },
      { accepted: ['we'], explanation: 'Subject.' },
    ],
    explanation: 'Open cloze.',
    verified: false,
  })

  it('записва опита с точки по части и грешката в тетрадката', async () => {
    const response = { answers: ['until', 'they'] }
    const attempt = await recordAttempt(
      {
        item,
        response,
        result: evaluateItem(item, response),
        mode: 'practice',
        at: NOW,
        durationMs: 9000,
      },
      database,
    )
    expect(attempt).toMatchObject({
      score: 1,
      max: 2,
      parts: [
        { key: 'g1', score: 1, max: 1 },
        { key: 'g2', score: 0, max: 1 },
      ],
    })
    expect(await database.errors.toArray()).toMatchObject([
      { id: 'cae-uoe-part2-001#g2', itemId: 'cae-uoe-part2-001', wrongCount: 1, status: 'active' },
    ])

    const fixed = { answers: ['until', 'we'] }
    await recordAttempt(
      {
        item,
        response: fixed,
        result: evaluateItem(item, fixed),
        mode: 'errors',
        at: at(26),
        durationMs: 5000,
      },
      database,
    )
    expect((await database.errors.get('cae-uoe-part2-001#g2'))?.streak).toBe(1)
    expect(await database.attempts.count()).toBe(2)
  })

  it('брои активността по дни от оценки и отговори', async () => {
    const session = await startSession('srs', {}, ['a'], NOW, database)
    await rateInSession(
      { sessionId: session.id, cardId: 'a', rating: 3, now: NOW, durationMs: 1, fromQueue: true },
      database,
    )
    const response = { answers: ['until', 'we'] }
    await recordAttempt(
      {
        item,
        response,
        result: evaluateItem(item, response),
        mode: 'practice',
        at: at(24),
        durationMs: 1,
      },
      database,
    )
    const days = await activityByDay(at(20), database)
    expect([...days].sort()).toEqual([
      ['2026-09-24', 1],
      ['2026-09-25', 1],
    ])
  })
})
