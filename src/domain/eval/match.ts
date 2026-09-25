import { normalizeAnswer } from '../text/normalize'

/** Правилата от полето `normalize` на задачите с кратък отговор. */
export type AnswerRules = {
  caseSensitive?: boolean
  keepPunctuation?: boolean
  /** Регулярен израз, който също приема отговора. Сравнява се с целия нормализиран отговор. */
  pattern?: string
}

/**
 * Приема ли се отговорът: съвпада с някой от приетите отговори след нормализиране
 * (регистър, интервали, пунктуация — виж normalizeAnswer) или с регулярния израз.
 */
export function isAccepted(
  given: string,
  accepted: readonly string[],
  rules: AnswerRules = {},
): boolean {
  const options = { caseSensitive: rules.caseSensitive, keepPunctuation: rules.keepPunctuation }
  const answer = normalizeAnswer(given, options)
  if (answer === '') return false
  if (accepted.some((variant) => normalizeAnswer(variant, options) === answer)) return true
  if (!rules.pattern) return false
  try {
    return new RegExp(`^(?:${rules.pattern})$`, rules.caseSensitive ? 'u' : 'iu').test(answer)
  } catch {
    return false
  }
}

/** Съдържа ли нормализираният текст фразата като цели думи. */
export function containsPhrase(normalized: string, phrase: string): boolean {
  return phrase !== '' && ` ${normalized} `.includes(` ${phrase} `)
}
