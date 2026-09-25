import { describe, expect, it } from 'vitest'
import { countByDay, currentStreak, heatmapWeeks } from './activity'
import { addRating, emptyStats, isStale } from './session'

const at = (d: number, h = 10) => new Date(2026, 8, d, h).getTime()

describe('countByDay и currentStreak', () => {
  it('брои действията по учебни дни', () => {
    const counts = countByDay([at(24), at(24, 20), at(25, 2), at(25, 9)])
    expect([...counts]).toEqual([
      ['2026-09-24', 3],
      ['2026-09-25', 1],
    ])
  })

  it('серията не е прекъсната, ако днес още няма учене', () => {
    const days = new Map([
      ['2026-09-22', 5],
      ['2026-09-23', 2],
      ['2026-09-24', 1],
    ])
    expect(currentStreak(days, '2026-09-24')).toBe(3)
    expect(currentStreak(days, '2026-09-25')).toBe(3)
    expect(currentStreak(days, '2026-09-26')).toBe(0)
  })
})

describe('heatmapWeeks', () => {
  it('подрежда дните по седмици от понеделник и не показва бъдещите', () => {
    // 25.09.2026 е петък.
    const weeks = heatmapWeeks(new Map([['2026-09-21', 4]]), '2026-09-25', 2)
    expect(weeks).toHaveLength(2)
    expect(weeks[0]?.[0]).toEqual({ day: '2026-09-14', count: 0 })
    expect(weeks[1]?.[0]).toEqual({ day: '2026-09-21', count: 4 })
    expect(weeks[1]?.[4]).toEqual({ day: '2026-09-25', count: 0 })
    expect(weeks[1]?.[5]).toBeNull()
  })
})

describe('статистика на сесията', () => {
  it('добавя и маха оценка', () => {
    const once = addRating(emptyStats(), 1)
    const twice = addRating(once, 3)
    expect(twice).toEqual({ answered: 2, correct: 1, ratings: [1, 0, 1, 0] })
    expect(addRating(twice, 3, -1)).toEqual(once)
  })

  it('сесия от минал учебен ден е остаряла', () => {
    expect(isStale({ startedAt: at(24, 23) }, at(25, 3))).toBe(false)
    expect(isStale({ startedAt: at(24, 23) }, at(25, 5))).toBe(true)
  })
})
