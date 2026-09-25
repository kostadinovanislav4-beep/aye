import type { TableRows } from './types'

/**
 * Примерни редове за всяка таблица — за тестовете на базата, миграциите и импорта.
 * Времената са около 25.09.2026 г.
 */
export const T0 = Date.UTC(2026, 8, 25, 8, 0)
const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

export function sampleRows(): TableRows {
  return {
    cards: [
      {
        id: 'bel-gram-chlen-001#c1',
        due: T0 + 3 * DAY,
        stability: 3.17,
        difficulty: 5.28,
        scheduledDays: 3,
        learningSteps: 0,
        reps: 2,
        lapses: 0,
        state: 2,
        lastReview: T0,
        updatedAt: T0,
      },
    ],
    reviews: [
      {
        id: '0mfz4a1c0-aaaaaaaaaaaaaa',
        cardId: 'bel-gram-chlen-001#c1',
        at: T0 - 10 * MINUTE,
        rating: 3,
        mode: 'srs',
        stateBefore: 0,
        durationMs: 5400,
      },
      {
        id: '0mfz4a1c1-bbbbbbbbbbbbbb',
        cardId: 'bel-gram-chlen-001#c1',
        at: T0,
        rating: 3,
        mode: 'srs',
        stateBefore: 1,
        durationMs: 3100,
        confidence: 4,
        sessionId: '0mfz4a1a0-ssssssssssssss',
      },
    ],
    attempts: [
      {
        id: '0mfz4a1c2-cccccccccccccc',
        itemId: 'cae-uoe-part1-001',
        at: T0 + MINUTE,
        mode: 'practice',
        response: { choices: [0, 2] },
        score: 1,
        max: 2,
        parts: [
          { key: 'g1', score: 1, max: 1 },
          { key: 'g2', score: 0, max: 1 },
        ],
        durationMs: 42_000,
      },
    ],
    errors: [
      {
        id: 'cae-uoe-part1-001#g2',
        itemId: 'cae-uoe-part1-001',
        status: 'active',
        wrongCount: 1,
        streak: 0,
        firstWrongAt: T0 + MINUTE,
        lastWrongAt: T0 + MINUTE,
        lastRightAt: null,
        masteredAt: null,
        lastMode: 'practice',
        lastResponse: 2,
        updatedAt: T0 + MINUTE,
      },
    ],
    sessions: [
      {
        id: '0mfz4a1a0-ssssssssssssss',
        mode: 'srs',
        status: 'done',
        startedAt: T0 - 15 * MINUTE,
        endedAt: T0 + MINUTE,
        updatedAt: T0 + MINUTE,
        scope: { decks: ['bel-gram-chlen'] },
        queue: ['bel-gram-chlen-001#c1'],
        position: 1,
        stats: { answered: 2, correct: 2, ratings: [0, 0, 2, 0] },
        undo: null,
      },
    ],
    exams: [
      {
        id: '0mfz4a1d0-eeeeeeeeeeeeee',
        exam: 'cae',
        kind: 'cae-reading-uoe',
        parts: [{ id: 'part1', title: 'Part 1', items: ['cae-uoe-part1-001'] }],
        answers: { 'cae-uoe-part1-001': { choices: [0, null] } },
        flagged: ['cae-uoe-part1-001'],
        timeByItem: { 'cae-uoe-part1-001': 95_000 },
        elapsedMs: 95_000,
        limitMs: 90 * MINUTE,
        status: 'active',
        startedAt: T0 + 2 * MINUTE,
        finishedAt: null,
        updatedAt: T0 + 4 * MINUTE,
        result: null,
      },
    ],
    writings: [
      {
        id: '0mfz4a1e0-wwwwwwwwwwwwww',
        pieceId: '0mfz4a1e0-pppppppppppppp',
        version: 1,
        taskId: 'cae-writing-essay-001',
        genre: 'cae-essay',
        status: 'saved',
        plan: { thesis: 'Parks matter more.', points: ['health', 'community', 'cost'] },
        text: 'Cities are changing fast.',
        words: 4,
        seconds: 600,
        selfScores: { content: 3, 'communicative-achievement': 3, organisation: 4, language: 3 },
        checklist: [true, true, false, true, false],
        examId: null,
        createdAt: T0 + 5 * MINUTE,
        updatedAt: T0 + 15 * MINUTE,
      },
    ],
    checks: [
      {
        id: 'bel-gram-chlen-001',
        status: 'problem',
        note: 'Липсва примерът с предлог.',
        hash: '1a2b3c4d',
        at: T0 + 20 * MINUTE,
        updatedAt: T0 + 20 * MINUTE,
      },
    ],
  }
}
