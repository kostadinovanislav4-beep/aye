import { parseCloze } from '../content/markers'
import type { ContentItem, ItemOfType, Rubric } from '../content/schema'
import type { Json } from '../progress/types'
import { evaluateEditText } from './editText'
import { evaluateKwt } from './kwt'
import { isAccepted } from './match'
import type { EvalResult, PartResult, Responses } from './types'

/*
 * Оценителите за всички типове елементи (раздел 5.3 от SPEC). Връщат точки общо и по части:
 * празни места (g1…), въпроси (q1…), грешки при редактиране (e1…), изтривания в cloze (c1…).
 * Точките са „сурови“ (по 1 за част, освен ако задачата казва друго) — изпитните тежести
 * се прилагат в симулатора.
 */

export type EvalContext = {
  /** Критериите от content/rubrics.json — за самооценката на писане и говорене. */
  rubrics?: ReadonlyMap<string, Rubric>
}

function part(key: string, correct: boolean, max = 1, given?: string): PartResult {
  return { key, score: correct ? max : 0, max, correct, ...(given === undefined ? {} : { given }) }
}

function total(parts: PartResult[], notes: string[] = []): EvalResult {
  const score = parts.reduce((sum, p) => sum + p.score, 0)
  const max = parts.reduce((sum, p) => sum + p.max, 0)
  return { score, max, correct: score === max, parts, notes, selfAssessed: false }
}

/** Отговор с буква или id на текст: без значение от регистъра и интервалите. */
function sameKey(given: number | string | null | undefined, expected: string): boolean {
  return typeof given === 'string' && given.trim().toUpperCase() === expected.toUpperCase()
}

const text = (value: number | string | null | undefined) => (typeof value === 'string' ? value : '')

// ——— По типове ———

export function evaluateBasic(_item: ItemOfType<'basic'>, response: Responses['basic']) {
  return total([part('', response.knew)])
}

/** Изтриване N в cloze: всички негови срещания трябва да са написани вярно. */
export function evaluateCloze(item: ItemOfType<'cloze'>, response: Responses['cloze']) {
  const deletions = parseCloze(item.text).filter((d) => d.index === response.deletion)
  const correct =
    deletions.length > 0 &&
    deletions.every((d, i) => isAccepted(response.answers[i] ?? '', [d.answer]))
  return total([part(`c${response.deletion}`, correct, 1, response.answers.join(' · '))])
}

export function evaluateMcq(item: ItemOfType<'mcq'>, response: Responses['mcq']) {
  return total([part('', response.choice === item.answer)])
}

export function evaluateShort(item: ItemOfType<'short'>, response: Responses['short']) {
  return total([
    part('', isAccepted(response.text, item.accepted, item.normalize), 1, response.text),
  ])
}

export function evaluateTextSet(item: ItemOfType<'text_set'>, response: Responses['text_set']) {
  const answer = (i: number) => response.answers[i] ?? null
  switch (item.format) {
    case 'questions':
      return total(
        item.questions.map((question, i) => {
          const key = `q${i + 1}`
          const max = question.points ?? 1
          if (question.kind === 'mcq') return part(key, answer(i) === question.answer, max)
          const given = text(answer(i))
          return part(key, isAccepted(given, question.accepted, question.normalize), max, given)
        }),
      )
    case 'cross_text':
    case 'matching':
      return total(
        item.questions.map((question, i) =>
          part(`q${i + 1}`, sameKey(answer(i), question.answer), question.points ?? 1),
        ),
      )
    case 'gapped':
      return total(item.gaps.map((gap, i) => part(`g${i + 1}`, sameKey(answer(i), gap.answer))))
  }
}

export function evaluateMcCloze(item: ItemOfType<'mc_cloze'>, response: Responses['mc_cloze']) {
  return total(
    item.gaps.map((gap, i) => part(`g${i + 1}`, (response.choices[i] ?? null) === gap.answer)),
  )
}

/** Open cloze и word formation: текст за всяко празно място. */
export function evaluateGapTexts(
  item: ItemOfType<'open_cloze'> | ItemOfType<'word_formation'>,
  response: Responses['open_cloze'],
) {
  return total(
    item.gaps.map((gap, i) => {
      const given = response.answers[i] ?? ''
      return part(`g${i + 1}`, isAccepted(given, gap.accepted), 1, given)
    }),
  )
}

export function evaluateListening(
  item: ItemOfType<'listening_set'>,
  response: Responses['listening_set'],
) {
  return total(
    item.questions.map((question, i) => {
      const key = `q${i + 1}`
      const given = response.answers[i] ?? null
      switch (question.kind) {
        case 'mcq':
          return part(key, given === question.answer)
        case 'completion':
          return part(key, isAccepted(text(given), question.accepted), 1, text(given))
        case 'match':
          return part(key, sameKey(given, question.answer))
      }
    }),
  )
}

/** Писане и говорене: сборът от самооценката по критериите, всеки в границите си. */
export function evaluateSelfAssessed(
  item: ItemOfType<'speaking_task'> | ItemOfType<'writing_task'>,
  response: Responses['writing_task'],
  ctx: EvalContext,
): EvalResult {
  const rubric = ctx.rubrics?.get(item.rubric)
  if (!rubric) throw new Error(`Непознати критерии „${item.rubric}“.`)
  const parts = rubric.criteria.map((criterion) => {
    const raw = response.scores[criterion.id] ?? 0
    const score = Math.min(criterion.max, Math.max(0, Math.round(raw)))
    return { key: criterion.id, score, max: criterion.max, correct: score === criterion.max }
  })
  return { ...total(parts), selfAssessed: true }
}

// ——— Отговор, записан като JSON ———

type JsonObject = { [key: string]: Json }

function asObject(value: Json | undefined): JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
}
const asInt = (value: Json | undefined) =>
  typeof value === 'number' && Number.isInteger(value) ? value : null
const asText = (value: Json | undefined) => (typeof value === 'string' ? value : '')
const asList = (value: Json | undefined): Json[] => (Array.isArray(value) ? value : [])
const asAnswer = (value: Json) =>
  typeof value === 'number' || typeof value === 'string' ? value : null

function asScores(value: Json | undefined): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const [key, score] of Object.entries(asObject(value))) {
    if (typeof score === 'number') scores[key] = score
  }
  return scores
}

/**
 * Оценява отговор, записан като JSON (от `attempts` или `exams`). Липсващ или повреден
 * отговор се оценява като празен — с 0 точки.
 */
export function evaluateItem(
  item: ContentItem,
  value: Json | undefined,
  ctx: EvalContext = {},
): EvalResult {
  const o = asObject(value)
  switch (item.type) {
    case 'basic':
      return evaluateBasic(item, { knew: o.knew === true })
    case 'cloze':
      return evaluateCloze(item, {
        deletion: asInt(o.deletion) ?? parseCloze(item.text)[0]?.index ?? 1,
        answers: asList(o.answers).map(asText),
      })
    case 'mcq':
      return evaluateMcq(item, { choice: asInt(o.choice) })
    case 'short':
      return evaluateShort(item, { text: asText(o.text) })
    case 'edit_text':
      return evaluateEditText(item, { text: typeof o.text === 'string' ? o.text : item.text })
    case 'text_set':
      return evaluateTextSet(item, { answers: asList(o.answers).map(asAnswer) })
    case 'mc_cloze':
      return evaluateMcCloze(item, { choices: asList(o.choices).map(asInt) })
    case 'open_cloze':
    case 'word_formation':
      return evaluateGapTexts(item, { answers: asList(o.answers).map(asText) })
    case 'kwt':
      return evaluateKwt(item, { text: asText(o.text) })
    case 'listening_set':
      return evaluateListening(item, { answers: asList(o.answers).map(asAnswer) })
    case 'speaking_task':
    case 'writing_task':
      return evaluateSelfAssessed(item, { scores: asScores(o.scores) }, ctx)
  }
}
