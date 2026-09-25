/** Правила за сравняване на свободен отговор с приетите отговори. */
export type NormalizeOptions = {
  /** Главните и малките букви имат значение (по подразбиране нямат). */
  caseSensitive?: boolean
  /** Пунктуацията се запазва, напр. в задачи за запетаи (по подразбиране се пренебрегва). */
  keepPunctuation?: boolean
}

// Знаците са записани с кодовете си, защото повечето са невидими или си приличат.
const COMBINING_MARKS = /\p{M}/gu
const APOSTROPHES = /[\u{2018}\u{2019}\u{2BC}\u{60}\u{B4}]/gu
const DOUBLE_QUOTES = /[\u{201C}\u{201D}\u{201E}\u{AB}\u{BB}]/gu
const DASHES = /[\u{2010}-\u{2015}\u{2212}]/gu
const PUNCTUATION = /\p{P}/gu
const SPACE_BEFORE_PUNCTUATION = /\s+([,.;:!?…])/g
const WHITESPACE = /\s+/g

/**
 * Привежда текст до вид за сравнение: Unicode NFC, без знаци за ударение,
 * еднакви апострофи, кавички и тирета, без излишни интервали.
 * „ѝ“ остава различно от „и“ — в NFC то е отделна буква, а не „и“ + знак.
 */
export function normalizeAnswer(value: string, options: NormalizeOptions = {}): string {
  let text = value
    .normalize('NFC')
    .replace(COMBINING_MARKS, '')
    .replace(APOSTROPHES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, '-')

  if (!options.caseSensitive) text = text.toLowerCase()

  text = options.keepPunctuation
    ? text.replace(SPACE_BEFORE_PUNCTUATION, '$1')
    : text.replace(PUNCTUATION, ' ')

  return text.replace(WHITESPACE, ' ').trim()
}
