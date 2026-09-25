import { describe, expect, it } from 'vitest'
import { clozeCardId, itemIdOf, newId, splitTargetId, targetId } from './ids'

describe('id на карти и части', () => {
  it('сглобява и разглобява id', () => {
    expect(targetId('bel-gram-chlen-001')).toBe('bel-gram-chlen-001')
    expect(targetId('cae-uoe-part1-002', 'g5')).toBe('cae-uoe-part1-002#g5')
    expect(clozeCardId('bel-gram-chlen-001', 2)).toBe('bel-gram-chlen-001#c2')
    expect(splitTargetId('cae-uoe-part1-002#g5')).toEqual({
      itemId: 'cae-uoe-part1-002',
      part: 'g5',
    })
    expect(splitTargetId('bel-gram-chlen-001')).toEqual({ itemId: 'bel-gram-chlen-001', part: '' })
    expect(itemIdOf('bel-gram-chlen-001#c2')).toBe('bel-gram-chlen-001')
  })
})

describe('newId', () => {
  it('дава различни id, подредени по време', () => {
    const ids = Array.from({ length: 200 }, () => newId(1_790_000_000_000))
    expect(new Set(ids).size).toBe(200)
    expect(newId(1_000) < newId(2_000_000_000_000)).toBe(true)
    expect(newId()).toMatch(/^[0-9a-z]{9}-[0-9a-z]{14}$/)
  })
})
