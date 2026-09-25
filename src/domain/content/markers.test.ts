import { describe, expect, it } from 'vitest'
import {
  checkGapMarkers,
  containsWord,
  countKwtWords,
  gapNumbers,
  hasStrayClozeBraces,
  parseCloze,
  stripMarkup,
} from './markers'

describe('празни места', () => {
  it('намира номерата по ред', () => {
    expect(gapNumbers('A [[1]] b [[2]] c')).toEqual([1, 2])
  })

  it('приема [[1]]…[[n]] точно по веднъж', () => {
    expect(checkGapMarkers('A [[1]] b [[2]]', 2)).toBeNull()
  })

  it('отхвърля липсващ, повторен или разместен маркер', () => {
    expect(checkGapMarkers('A [[1]]', 2)).not.toBeNull()
    expect(checkGapMarkers('A [[1]] [[1]]', 2)).not.toBeNull()
    expect(checkGapMarkers('A [[2]] [[1]]', 2)).not.toBeNull()
  })
})

describe('cloze', () => {
  it('чете изтриванията с и без подсказка', () => {
    expect(parseCloze('{{c1::подлог}} и {{c2::сказуемно определение::вид определение}}')).toEqual([
      { index: 1, answer: 'подлог' },
      { index: 2, answer: 'сказуемно определение', hint: 'вид определение' },
    ])
  })

  it('открива сбъркан синтаксис', () => {
    expect(hasStrayClozeBraces('{{c1::добре}}')).toBe(false)
    expect(hasStrayClozeBraces('{{c1:зле}}')).toBe(true)
  })

  it('маха маркировката', () => {
    expect(stripMarkup('Пълен член при {{c1::подлог::?}} и [[1]].')).toBe(
      'Пълен член при подлог и  .',
    )
  })
})

describe('countKwtWords', () => {
  it('брои обикновените думи', () => {
    expect(countKwtWords('is said to have')).toBe(4)
  })

  it('брои съкратените форми за две думи', () => {
    expect(countKwtWords("wasn't until")).toBe(3)
    expect(countKwtWords("it's high time")).toBe(4)
    expect(countKwtWords("they're unlikely to")).toBe(4)
  })

  it('не брои притежателното „’s“ за отделна дума', () => {
    expect(countKwtWords('the manager’s decision')).toBe(3)
  })
})

describe('containsWord', () => {
  it('търси цяла дума без значение от регистъра', () => {
    expect(containsWord('is said to have', 'SAID')).toBe(true)
    expect(containsWord('unsaid words', 'SAID')).toBe(false)
  })
})
