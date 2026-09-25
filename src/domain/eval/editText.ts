import { findFragment } from '../content/markers'
import type { ItemOfType } from '../content/schema'
import type { EvalResult, PartResult } from './types'

/*
 * Оценяване на редактирането (БЕЛ): потребителят поправя текста на място, а тук се сравнява
 * поправеният текст с оригинала. Разликите се търсят по думи и знаци; всяка разлика се
 * свързва с грешката, която засяга. Промени извън грешките се отчитат като излишни.
 */

type Token = { text: string; start: number; end: number }

/** Промяна спрямо оригинала: знаците [start, end) са заменени с `replacement`. */
export type Hunk = { start: number; end: number; replacement: string }

// Дума (с тире или апостроф вътре: „по-добър“, „don't“), поредица от интервали или друг знак.
const TOKEN = /[\p{L}\p{M}\p{N}]+(?:[-'\u{2019}][\p{L}\p{M}\p{N}]+)*|\s+|\S/gu
const QUOTES = /[\u{201C}\u{201D}\u{201E}\u{AB}\u{BB}]/gu
const APOSTROPHES = /[\u{2018}\u{2019}\u{2BC}]/gu

/** Над толкова комбинации от поправки грешките в една група се проверяват поотделно. */
const MAX_COMBINATIONS = 256

function tokenize(text: string): Token[] {
  return Array.from(text.matchAll(TOKEN), (match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }))
}

/**
 * Вид за сравнение: еднакви кавички и апострофи, един интервал. Тиретата остават различни —
 * тире и малко тире са различни знаци в българския правопис.
 */
function canonical(text: string): string {
  return text
    .normalize('NFC')
    .replace(QUOTES, '"')
    .replace(APOSTROPHES, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Разликите между оригинала и поправения текст (най-дълга обща подредица от думи и знаци). */
export function diffText(original: string, edited: string): Hunk[] {
  const a = tokenize(original)
  const b = tokenize(edited)
  const width = b.length + 1
  // common[i * width + j] — дължината на най-дългата обща подредица на a[i..] и b[j..].
  const common = new Uint32Array((a.length + 1) * width)
  const at = (i: number, j: number) => common[i * width + j] ?? 0
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      common[i * width + j] =
        a[i]?.text === b[j]?.text ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1))
    }
  }

  const hunks: Hunk[] = []
  let open: { i: number; j: number } | null = null
  const close = (i: number, j: number) => {
    if (!open) return
    const start = a[open.i]?.start ?? original.length
    const end = i > open.i ? (a[i - 1]?.end ?? start) : start
    const replacement = b
      .slice(open.j, j)
      .map((token) => token.text)
      .join('')
    hunks.push({ start, end, replacement })
    open = null
  }

  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    const same = i < a.length && j < b.length && a[i]?.text === b[j]?.text
    if (same && at(i, j) === at(i + 1, j + 1) + 1) {
      close(i, j)
      i += 1
      j += 1
      continue
    }
    open ??= { i, j }
    if (j < b.length && (i >= a.length || at(i, j + 1) >= at(i + 1, j))) j += 1
    else i += 1
  }
  close(a.length, b.length)
  return hunks
}

/** Засяга ли промяната грешката: застъпва я или е вмъкване вътре в нея или на ръба ѝ. */
function touches(hunk: Hunk, start: number, end: number): boolean {
  if (hunk.start === hunk.end) return hunk.start >= start && hunk.start <= end
  return hunk.start < end && hunk.end > start
}

/** Промяна само в интервалите (напр. два интервала вместо един) не е поправка. */
function isSpacing(hunk: Hunk, original: string): boolean {
  const before = original.slice(hunk.start, hunk.end)
  return /^\s+$/.test(before) && /^\s+$/.test(hunk.replacement)
}

/** Текстът в [from, to) след промените. */
function applyHunks(original: string, from: number, to: number, hunks: readonly Hunk[]): string {
  let result = ''
  let cursor = from
  for (const hunk of [...hunks].sort((x, y) => x.start - y.start)) {
    result += original.slice(cursor, hunk.start) + hunk.replacement
    cursor = hunk.end
  }
  return result + original.slice(cursor, to)
}

type Span = { index: number; start: number; end: number; accepted: readonly string[] }

/**
 * Кои грешки от групата са поправени: търси комбинация от поправки (или непоправени места),
 * която дава точно текста на потребителя. Ако няма такава — нито една не се брои.
 */
function solveGroup(original: string, group: Span[], from: number, to: number, given: string) {
  const target = canonical(given)
  const options = group.map((span) => [...span.accepted, null])
  const total = options.reduce((product, list) => product * list.length, 1)

  if (total > MAX_COMBINATIONS) {
    // Твърде много варианти: всяка грешка се проверява сама, с непоправени съседи.
    return group.map((span) =>
      span.accepted.some(
        (fix) =>
          canonical(original.slice(from, span.start) + fix + original.slice(span.end, to)) ===
          target,
      ),
    )
  }

  let best: boolean[] | null = null
  for (let n = 0; n < total; n += 1) {
    let rest = n
    let text = ''
    let cursor = from
    const fixed: boolean[] = []
    group.forEach((span, k) => {
      const list = options[k] ?? [null]
      const fix = list[rest % list.length] ?? null
      rest = Math.floor(rest / list.length)
      text += original.slice(cursor, span.start) + (fix ?? original.slice(span.start, span.end))
      cursor = span.end
      fixed.push(fix !== null)
    })
    text += original.slice(cursor, to)
    if (canonical(text) !== target) continue
    const count = fixed.filter(Boolean).length
    if (!best || count > best.filter(Boolean).length) best = fixed
  }
  return best ?? group.map(() => false)
}

function extraNote(count: number): string {
  return count === 1
    ? 'Има 1 излишна промяна извън грешките.'
    : `Има ${count} излишни промени извън грешките.`
}

export function evaluateEditText(
  item: ItemOfType<'edit_text'>,
  response: { text: string },
): EvalResult {
  const original = item.text
  const hunks = diffText(original, response.text)
  const spans: Span[] = item.errors.flatMap((error, index) => {
    const start = findFragment(original, error.fragment, error.occurrence ?? 1)
    return start < 0
      ? []
      : [{ index, start, end: start + error.fragment.length, accepted: error.accepted }]
  })

  // Грешки, засегнати от една и съща промяна, се оценяват заедно.
  const groupOf = spans.map((_, k) => k)
  const find = (k: number): number => (groupOf[k] === k ? k : find(groupOf[k] ?? k))
  const touching = spans.map((span) => hunks.filter((hunk) => touches(hunk, span.start, span.end)))
  spans.forEach((_, k) => {
    for (let m = 0; m < k; m += 1) {
      if (touching[k]?.some((hunk) => touching[m]?.includes(hunk))) groupOf[find(k)] = find(m)
    }
  })

  const used = new Set(touching.flat())
  const scores = new Map<number, PartResult>()
  for (const root of new Set(spans.map((_, k) => find(k)))) {
    const members = spans
      .map((span, k) => ({ span, k }))
      .filter(({ k }) => find(k) === root)
      .sort((x, y) => x.span.start - y.span.start)
    const groupHunks = [...new Set(members.flatMap(({ k }) => touching[k] ?? []))]
    const from = Math.min(
      ...members.map(({ span }) => span.start),
      ...groupHunks.map((h) => h.start),
    )
    const to = Math.max(...members.map(({ span }) => span.end), ...groupHunks.map((h) => h.end))
    const given = applyHunks(original, from, to, groupHunks)
    const fixed = solveGroup(
      original,
      members.map(({ span }) => span),
      from,
      to,
      given,
    )
    members.forEach(({ span }, m) => {
      const correct = fixed[m] ?? false
      scores.set(span.index, {
        key: `e${span.index + 1}`,
        score: correct ? 1 : 0,
        max: 1,
        correct,
        given: canonical(given),
      })
    })
  }

  const parts = item.errors.map(
    (_, index) => scores.get(index) ?? { key: `e${index + 1}`, score: 0, max: 1, correct: false },
  )
  const extra = hunks.filter((hunk) => !used.has(hunk) && !isSpacing(hunk, original)).length
  const score = parts.reduce((sum, part) => sum + part.score, 0)
  return {
    score,
    max: parts.length,
    correct: score === parts.length,
    parts,
    notes: extra > 0 ? [extraNote(extra)] : [],
    selfAssessed: false,
  }
}
