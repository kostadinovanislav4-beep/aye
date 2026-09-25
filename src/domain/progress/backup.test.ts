import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../settings/settings'
import { rateCard } from '../srs/fsrs'
import {
  BACKUP_FORMAT,
  BackupError,
  mergeCards,
  newLogRows,
  newerRows,
  parseBackup,
} from './backup'
import { sampleRows } from './fixtures'
import type { ReviewRecord } from './types'

const file = (overrides: Record<string, unknown> = {}) => ({
  app: 'aye',
  format: BACKUP_FORMAT,
  exportedAt: 1,
  settings: { theme: 'dark' },
  tables: sampleRows(),
  ...overrides,
})

describe('parseBackup', () => {
  it('приема правилен файл и допълва настройките', () => {
    const backup = parseBackup(JSON.parse(JSON.stringify(file())))
    expect(backup.tables).toEqual(sampleRows())
    expect(backup.settings).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' })
  })

  it('липсващите таблици са празни', () => {
    expect(parseBackup(file({ tables: {} })).tables.cards).toEqual([])
  })

  it('отказва чужд, по-нов или повреден файл с обяснение', () => {
    expect(() => parseBackup({ hello: 1 })).toThrow('Файлът не е бекъп на AYE.')
    expect(() => parseBackup(file({ format: BACKUP_FORMAT + 1 }))).toThrow('по-нова версия')
    const broken = sampleRows()
    const [first] = broken.cards
    if (first) broken.cards[0] = { ...first, state: 7 as never }
    expect(() => parseBackup(file({ tables: broken }))).toThrow(BackupError)
    expect(() => parseBackup(file({ tables: broken }))).toThrow('cards.0.state')
  })
})

describe('сливане на редове', () => {
  it('по-новият ред печели, а дневниците се обединяват по id', () => {
    const local = new Map([['a', { id: 'a', updatedAt: 5 }]])
    expect(
      newerRows(local, [
        { id: 'a', updatedAt: 4 },
        { id: 'b', updatedAt: 1 },
      ]),
    ).toEqual([{ id: 'b', updatedAt: 1 }])
    expect(newerRows(local, [{ id: 'a', updatedAt: 6 }])).toEqual([{ id: 'a', updatedAt: 6 }])
    expect(newLogRows(new Set(['x']), [{ id: 'x' }, { id: 'y' }])).toEqual([{ id: 'y' }])
  })
})

describe('mergeCards', () => {
  const T = new Date(2026, 8, 20, 10).getTime()
  const DAY = 24 * 60 * 60_000
  const review = (id: string, at: number, rating: ReviewRecord['rating']): ReviewRecord => ({
    id,
    cardId: 'c',
    at,
    rating,
    mode: 'srs',
    stateBefore: 0,
    durationMs: 1,
  })
  const common = [review('r1', T, 3), review('r2', T + 10 * 60_000, 3)]
  const base = rateCard('c', rateCard('c', null, 3, T), 3, T + 10 * 60_000)

  it('ако само другото устройство има нови оценки, печели неговата карта', () => {
    const later = rateCard('c', base, 3, T + 3 * DAY)
    const result = mergeCards({
      localCards: new Map([['c', base]]),
      incomingCards: [later],
      localReviews: common,
      incomingReviews: [...common, review('r3', T + 3 * DAY, 3)],
    })
    expect(result).toEqual({ cards: [later], recomputed: 0 })
  })

  it('ако и двете устройства имат нови оценки, картата се преизчислява от общата история', () => {
    const here = review('here', T + 2 * DAY, 1)
    const there = review('there', T + 3 * DAY, 3)
    const result = mergeCards({
      localCards: new Map([['c', rateCard('c', base, 1, T + 2 * DAY)]]),
      incomingCards: [rateCard('c', base, 3, T + 3 * DAY)],
      localReviews: [...common, here],
      incomingReviews: [...common, there],
    })
    const expected = rateCard('c', rateCard('c', base, 1, T + 2 * DAY), 3, T + 3 * DAY)
    expect(result).toEqual({ cards: [expected], recomputed: 1 })
  })

  it('не пипа карта, която тук е по-нова', () => {
    const local = rateCard('c', base, 3, T + 3 * DAY)
    const result = mergeCards({
      localCards: new Map([['c', local]]),
      incomingCards: [base],
      localReviews: [...common, review('r3', T + 3 * DAY, 3)],
      incomingReviews: common,
    })
    expect(result.cards).toEqual([])
  })
})
