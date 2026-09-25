import { describe, expect, it } from 'vitest'
import type { EvalResult } from '../eval/types'
import type { ErrorRecord } from '../progress/types'
import { applyOutcome, countByTag, outcomesOf, reviewOrder, type Outcome } from './notebook'

const day = (d: number, h = 10) => new Date(2026, 8, d, h).getTime()
const wrong: Outcome = { id: 'cae-uoe-part1-001#g2', itemId: 'cae-uoe-part1-001', correct: false }
const right: Outcome = { ...wrong, correct: true }
const ctx = (at: number) => ({ at, mode: 'practice' as const, response: 2 })

/** Прилага поредица от отговори и връща последното състояние на записа. */
function run(steps: [Outcome, number][]): ErrorRecord | undefined {
  let entry: ErrorRecord | undefined
  for (const [outcome, at] of steps) entry = applyOutcome(entry, outcome, ctx(at)) ?? entry
  return entry
}

describe('outcomesOf', () => {
  const result = (parts: EvalResult['parts'], selfAssessed = false): EvalResult => ({
    score: 0,
    max: 0,
    correct: false,
    parts,
    notes: [],
    selfAssessed,
  })

  it('дава по един резултат за всяка част', () => {
    const outcomes = outcomesOf(
      'cae-uoe-part1-001',
      result([
        { key: 'g1', score: 1, max: 1, correct: true },
        { key: 'g2', score: 0, max: 1, correct: false },
      ]),
    )
    expect(outcomes.map((o) => [o.id, o.correct])).toEqual([
      ['cae-uoe-part1-001#g1', true],
      ['cae-uoe-part1-001#g2', false],
    ])
    expect(
      outcomesOf('bel-x-001', result([{ key: '', score: 0, max: 1, correct: false }]))[0]?.id,
    ).toBe('bel-x-001')
  })

  it('пропуска самооценката', () => {
    expect(
      outcomesOf('w', result([{ key: 'content', score: 1, max: 5, correct: false }], true)),
    ).toEqual([])
  })
})

describe('applyOutcome', () => {
  it('грешка създава запис, верен отговор без запис не създава', () => {
    expect(applyOutcome(undefined, right, ctx(day(1)))).toBeNull()
    expect(applyOutcome(undefined, wrong, ctx(day(1)))).toMatchObject({
      status: 'active',
      wrongCount: 1,
      streak: 0,
      firstWrongAt: day(1),
      lastResponse: 2,
    })
  })

  it('записът е усвоен след 3 поредни верни отговора в различни дни', () => {
    const entry = run([
      [wrong, day(1)],
      [right, day(2)],
      [right, day(2, 18)],
      [right, day(3)],
      [right, day(4)],
    ])
    expect(entry).toMatchObject({ status: 'mastered', streak: 3, masteredAt: day(4) })
  })

  it('първият верен отговор след грешката се брои и в същия ден', () => {
    const entry = run([
      [wrong, day(1)],
      [right, day(1, 11)],
      [right, day(2)],
      [right, day(3)],
    ])
    expect(entry?.status).toBe('mastered')
  })

  it('верен отговор след полунощ, но преди 4:00, е в същия учебен ден', () => {
    const entry = run([
      [wrong, day(1)],
      [right, day(1, 22)],
      [right, day(2, 2)],
    ])
    expect(entry?.streak).toBe(1)
  })

  it('нова грешка нулира серията и връща усвоения запис', () => {
    const entry = run([
      [wrong, day(1)],
      [right, day(2)],
      [right, day(3)],
      [wrong, day(4)],
    ])
    expect(entry).toMatchObject({
      status: 'active',
      streak: 0,
      wrongCount: 2,
      firstWrongAt: day(1),
    })

    const again = run([
      [wrong, day(1)],
      [right, day(2)],
      [right, day(3)],
      [right, day(4)],
      [wrong, day(10)],
    ])
    expect(again).toMatchObject({ status: 'active', masteredAt: null, wrongCount: 2 })
  })
})

describe('reviewOrder', () => {
  const entry = (
    id: string,
    wrongCount: number,
    lastWrongAt: number,
    extra: Partial<ErrorRecord> = {},
  ) =>
    ({
      id,
      itemId: id,
      status: 'active',
      wrongCount,
      streak: 0,
      firstWrongAt: lastWrongAt,
      lastWrongAt,
      lastRightAt: null,
      masteredAt: null,
      lastMode: 'practice',
      lastResponse: null,
      updatedAt: lastWrongAt,
      ...extra,
    }) satisfies ErrorRecord

  it('подрежда по честота и давност и крие отговорените днес и усвоените', () => {
    const now = day(20)
    const order = reviewOrder(
      [
        entry('once-recent', 1, day(19)),
        entry('three-times', 3, day(19)),
        entry('once-old', 1, day(1)),
        entry('mastered', 5, day(2), { status: 'mastered' }),
        entry('right-today', 4, day(18), { streak: 1, lastRightAt: day(20, 8) }),
      ],
      now,
    )
    expect(order.map((e) => e.id)).toEqual(['once-old', 'three-times', 'once-recent'])
  })

  it('брои грешките по тагове', () => {
    const counts = countByTag([entry('a', 2, day(1)), entry('b', 1, day(1))], (e) =>
      e.id === 'a' ? ['bel', 'bel.punct'] : ['bel'],
    )
    expect([...counts]).toEqual([
      ['bel', 3],
      ['bel.punct', 2],
    ])
  })
})
