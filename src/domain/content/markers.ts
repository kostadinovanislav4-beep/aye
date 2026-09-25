/** Празно място в текст: [[1]], [[2]] … */
const GAP_MARKER = /\[\[(\d+)\]\]/g

/** Cloze изтриване: {{c1::отговор}} или {{c1::отговор::подсказка}}. */
const CLOZE = /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g

export type ClozeDeletion = {
  readonly index: number
  readonly answer: string
  readonly hint?: string
}

/** Номерата на празните места в реда, в който се срещат в текста. */
export function gapNumbers(text: string): number[] {
  return Array.from(text.matchAll(GAP_MARKER), (match) => Number(match[1]))
}

/**
 * Проверява, че в текста има точно маркерите [[1]] … [[expected]], всеки веднъж и по ред.
 * Връща описание на проблема или null, ако всичко е наред.
 */
export function checkGapMarkers(text: string, expected: number): string | null {
  const found = gapNumbers(text)
  const ok = found.length === expected && found.every((number, i) => number === i + 1)
  if (ok) return null
  const wanted = Array.from({ length: expected }, (_, i) => `[[${i + 1}]]`).join(', ')
  const actual = found.length > 0 ? found.map((n) => `[[${n}]]`).join(', ') : 'нито един'
  return `Очаквам маркерите ${wanted}, а в текста има ${actual}.`
}

export function parseCloze(text: string): ClozeDeletion[] {
  return Array.from(text.matchAll(CLOZE), (match) => ({
    index: Number(match[1]),
    answer: match[2] ?? '',
    ...(match[3] === undefined ? {} : { hint: match[3] }),
  }))
}

/** Къде е n-тото срещане (от 1) на фрагмента в текста; -1, ако няма толкова срещания. */
export function findFragment(text: string, fragment: string, occurrence = 1): number {
  if (fragment === '') return -1
  let from = 0
  for (let found = 1; ; found += 1) {
    const at = text.indexOf(fragment, from)
    if (at < 0 || found === occurrence) return at
    from = at + fragment.length
  }
}

export type ClozePiece = { text: string } | ClozeDeletion

/** Текстът на cloze на парчета: обикновен текст и изтривания, по реда им. */
export function splitCloze(text: string): ClozePiece[] {
  const pieces: ClozePiece[] = []
  let cursor = 0
  for (const match of text.matchAll(CLOZE)) {
    if (match.index > cursor) pieces.push({ text: text.slice(cursor, match.index) })
    pieces.push({
      index: Number(match[1]),
      answer: match[2] ?? '',
      ...(match[3] === undefined ? {} : { hint: match[3] }),
    })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) pieces.push({ text: text.slice(cursor) })
  return pieces
}

/** Остават ли {{ или }} извън правилните изтривания — знак за грешка в синтаксиса. */
export function hasStrayClozeBraces(text: string): boolean {
  return /\{\{|\}\}/.test(text.replace(CLOZE, ''))
}

/** Текстът без маркировка: изтриванията стават отговори, празните места — интервали. */
export function stripMarkup(text: string): string {
  return text.replace(CLOZE, (_match, _index, answer: string) => answer).replace(GAP_MARKER, ' ')
}

// След „'s“ броим две думи само когато е съкращение на „is/has/us“ (it's, he's, let's).
const CONTRACTED_S = new Set([
  'it',
  'he',
  'she',
  'that',
  'there',
  'here',
  'what',
  'who',
  'where',
  'when',
  'how',
  'let',
])

/**
 * Брои думите в отговор за key word transformation.
 * Съкратените форми (don't, they're, it's) се броят за две думи.
 * Правилото предстои да се свери с handbook-а на C1 Advanced (content/SOURCES.md).
 */
export function countKwtWords(answer: string): number {
  const words = answer
    .replace(/[\u{2018}\u{2019}]/gu, "'")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  let count = 0
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[.,!?;:]+$/, '')
    count += 1
    if (/n't$/.test(lower) || /'(re|ve|ll|d|m)$/.test(lower)) count += 1
    else if (lower.endsWith("'s") && CONTRACTED_S.has(lower.slice(0, -2))) count += 1
  }
  return count
}

/** Съдържа ли текстът думата като цяла дума (без значение от регистъра). */
export function containsWord(text: string, word: string): boolean {
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'iu').test(text)
}
