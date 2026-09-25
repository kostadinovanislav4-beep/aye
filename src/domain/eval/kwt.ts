import { containsWord, countKwtWords } from '../content/markers'
import type { ItemOfType } from '../content/schema'
import { normalizeAnswer } from '../text/normalize'
import { containsPhrase } from './match'
import type { EvalResult } from './types'

/*
 * Key word transformation (CAE част 4): 2 точки за пълен приет отговор, иначе по 1 точка за
 * всяка вярна част, но най-много 1. Отговор над 6 думи или без ключовата дума носи 0 точки.
 * Тези правила чакат сверяване с handbook-а (content/SOURCES.md).
 */

export const KWT_MAX_WORDS = 6
export const KWT_MIN_WORDS = 3

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean)
const wordCount = (n: number) => (n === 1 ? '1 дума' : `${n} думи`)

/**
 * Ако е написано цялото второ изречение, оставя само частта на мястото на [[1]].
 * Сравнява нормализирано, а реже по думите на оригиналния отговор.
 */
function gapPart(text: string, gapped: string): string {
  const [before = '', after = ''] = gapped.split('[[1]]')
  let parts = words(text)
  const answer = normalizeAnswer(text)
  const prefix = normalizeAnswer(before)
  const suffix = normalizeAnswer(after)
  if (prefix && answer.startsWith(`${prefix} `)) parts = parts.slice(words(before).length)
  if (suffix && answer.endsWith(` ${suffix}`)) parts = parts.slice(0, -words(after).length)
  return parts.join(' ')
}

export function evaluateKwt(item: ItemOfType<'kwt'>, response: { text: string }): EvalResult {
  const given = gapPart(response.text, item.gapped)
  const answer = normalizeAnswer(given)
  const notes: string[] = []
  let score = 0

  if (answer !== '') {
    const count = countKwtWords(given)
    if (!containsWord(given, item.keyword)) {
      notes.push(`Липсва ключовата дума „${item.keyword}“ или е променена.`)
    } else if (count > KWT_MAX_WORDS) {
      notes.push(`Отговорът е от ${wordCount(count)}, а са разрешени най-много ${KWT_MAX_WORDS}.`)
    } else if (item.answers.some((full) => normalizeAnswer(full) === answer)) {
      score = 2
    } else {
      const found = item.parts.filter((part) =>
        part.accepted.some((variant) => containsPhrase(answer, normalizeAnswer(variant))),
      ).length
      score = Math.min(1, found)
    }
    if (count < KWT_MIN_WORDS && score < 2) {
      notes.push(`Отговорът е от ${wordCount(count)}, а трябва да е поне ${KWT_MIN_WORDS}.`)
    }
  }

  return {
    score,
    max: 2,
    correct: score === 2,
    parts: [{ key: '', score, max: 2, correct: score === 2, given }],
    notes,
    selfAssessed: false,
  }
}
