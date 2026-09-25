import { describe, expect, it } from 'vitest'
import type { CardRecord, ReviewRecord } from '../progress/types'
import { formatInterval } from './format'
import { fromFsrsCard, previewDue, rateCard, replayCard, retrievability, toFsrsCard } from './fsrs'

const NOW = new Date(2026, 8, 25, 10, 0).getTime()
const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
const ID = 'bel-gram-chlen-001#c1'

/** Карта, която е минала учене и е на преговор. */
function reviewCard(): CardRecord {
  let card = rateCard(ID, null, 3, NOW - 10 * DAY)
  card = rateCard(ID, card, 3, NOW - 10 * DAY + 10 * MINUTE)
  return card
}

describe('rateCard', () => {
  it('нова карта: „Отново“ след 1 мин, „Добре“ след 10 мин, „Лесно“ — направо на преговор', () => {
    const again = rateCard(ID, null, 1, NOW)
    expect(again).toMatchObject({ id: ID, state: 1, due: NOW + MINUTE, reps: 1, lastReview: NOW })

    const good = rateCard(ID, null, 3, NOW)
    expect(good).toMatchObject({ state: 1, due: NOW + 10 * MINUTE })

    const easy = rateCard(ID, null, 4, NOW)
    expect(easy.state).toBe(2)
    expect(easy.due).toBeGreaterThanOrEqual(NOW + DAY)
    expect(easy.updatedAt).toBe(NOW)
  })

  it('„Отново“ на карта за преговор я връща в повторно учене и брои пропуск', () => {
    const card = reviewCard()
    expect(card.state).toBe(2)
    const lapsed = rateCard(ID, card, 1, card.due)
    expect(lapsed).toMatchObject({ state: 3, lapses: 1, reps: 3 })
    expect(lapsed.due).toBeLessThan(card.due + DAY)
  })

  it('преминава през ts-fsrs без загуба на полета', () => {
    const card = reviewCard()
    expect(fromFsrsCard(ID, toFsrsCard(card, NOW), card.updatedAt)).toEqual(card)
  })
})

describe('previewDue', () => {
  it('дава по-късен преговор за по-висока оценка', () => {
    const due = previewDue(reviewCard(), NOW)
    expect(due[1]).toBeLessThan(due[2])
    expect(due[2]).toBeLessThan(due[3])
    expect(due[3]).toBeLessThan(due[4])
  })
})

describe('retrievability', () => {
  it('е 0 за нова карта и намалява с времето', () => {
    const card = reviewCard()
    expect(retrievability(null, NOW)).toBe(0)
    const soon = retrievability(card, card.lastReview ?? NOW)
    const later = retrievability(card, (card.lastReview ?? NOW) + 30 * DAY)
    expect(soon).toBeGreaterThan(0.95)
    expect(later).toBeLessThan(soon)
  })
})

describe('replayCard', () => {
  const log = (at: number, rating: ReviewRecord['rating'], mode: ReviewRecord['mode'] = 'srs') => ({
    at,
    rating,
    mode,
  })

  it('стига до същата карта като поредните оценки, независимо от реда на входа', () => {
    const history = [log(NOW + 10 * MINUTE, 3), log(NOW, 3), log(NOW + 3 * DAY, 2)]
    let expected = rateCard(ID, null, 3, NOW)
    expected = rateCard(ID, expected, 3, NOW + 10 * MINUTE)
    expected = rateCard(ID, expected, 2, NOW + 3 * DAY)
    expect(replayCard(ID, history)).toEqual(expected)
  })

  it('пропуска оценките в cram и връща null без история', () => {
    expect(replayCard(ID, [log(NOW, 1, 'cram')])).toBeNull()
    expect(replayCard(ID, [log(NOW, 3), log(NOW + MINUTE, 1, 'cram')])).toEqual(
      rateCard(ID, null, 3, NOW),
    )
  })
})

describe('formatInterval', () => {
  it('пише интервалите правилно на български', () => {
    expect(formatInterval(30_000)).toBe('< 1 мин')
    expect(formatInterval(10 * MINUTE)).toBe('10 мин')
    expect(formatInterval(3 * 60 * MINUTE)).toBe('3 ч')
    expect(formatInterval(DAY)).toBe('1 ден')
    expect(formatInterval(12 * DAY)).toBe('12 дни')
    expect(formatInterval(31 * DAY)).toBe('1 месец')
    expect(formatInterval(62 * DAY)).toBe('2 месеца')
    expect(formatInterval(365 * DAY)).toBe('1 година')
    expect(formatInterval(548 * DAY)).toBe('1,5 години')
    expect(formatInterval(730 * DAY)).toBe('2 години')
  })
})
