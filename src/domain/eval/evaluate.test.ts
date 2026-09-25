import { describe, expect, it } from 'vitest'
import { itemSchema, rubricsFileSchema, type ContentItem } from '../content/schema'
import type { Json } from '../progress/types'
import { evaluateItem } from './evaluate'

const common = { difficulty: 2, explanation: 'Обяснение.', verified: false }
const bel = { ...common, exam: 'bel', tags: ['bel'] }
const cae = { ...common, exam: 'cae', tags: ['cae'] }

const item = (data: Record<string, unknown>): ContentItem => itemSchema.parse(data)
const score = (target: ContentItem, response: Json) => {
  const result = evaluateItem(target, response)
  return [result.score, result.max]
}

const rubrics = new Map(
  rubricsFileSchema
    .parse({
      rubrics: [
        {
          id: 'cae-writing',
          exam: 'cae',
          title: 'Writing',
          criteria: [
            { id: 'content', name: 'Content', max: 5 },
            { id: 'language', name: 'Language', max: 5 },
          ],
          verified: false,
        },
      ],
    })
    .rubrics.map((rubric) => [rubric.id, rubric]),
)

describe('evaluateItem', () => {
  it('basic: знаех или не знаех', () => {
    const basic = item({
      ...cae,
      id: 'a-001',
      type: 'basic',
      front: 'shed light on',
      back: 'explain',
    })
    expect(score(basic, { knew: true })).toEqual([1, 1])
    expect(score(basic, { knew: false })).toEqual([0, 1])
  })

  it('cloze: всички срещания на изтриването трябва да са верни', () => {
    const cloze = item({
      ...bel,
      id: 'a-002',
      type: 'cloze',
      text: '{{c1::Ботев}} е роден в {{c2::Калофер}}, а {{c1::Ботев}} е поет.',
    })
    const result = evaluateItem(cloze, { deletion: 1, answers: ['ботев', 'Ботев'] })
    expect(result.parts).toEqual([
      { key: 'c1', score: 1, max: 1, correct: true, given: 'ботев · Ботев' },
    ])
    expect(score(cloze, { deletion: 1, answers: ['Ботев'] })).toEqual([0, 1])
    expect(score(cloze, { deletion: 2, answers: ['Калофер'] })).toEqual([1, 1])
  })

  it('mcq и short', () => {
    const mcq = item({
      ...bel,
      id: 'a-003',
      type: 'mcq',
      prompt: 'Кое?',
      options: [
        { text: 'А', why: 'Не.' },
        { text: 'Б' },
        { text: 'В', why: 'Не.' },
        { text: 'Г', why: 'Не.' },
      ],
      answer: 1,
    })
    expect(score(mcq, { choice: 1 })).toEqual([1, 1])
    expect(score(mcq, { choice: 0 })).toEqual([0, 1])
    expect(score(mcq, { choice: null })).toEqual([0, 1])

    const short = item({
      ...bel,
      id: 'a-004',
      type: 'short',
      prompt: 'Два (стол)',
      accepted: ['стола', 'два стола'],
    })
    expect(score(short, { text: 'Два стола.' })).toEqual([1, 1])
    expect(score(short, { text: 'столове' })).toEqual([0, 1])
  })

  it('text_set: въпроси с точки, съпоставяне и извадени абзаци', () => {
    const questions = item({
      ...bel,
      id: 'a-005',
      type: 'text_set',
      format: 'questions',
      passages: [{ id: 'A', text: 'Текст.' }],
      questions: [
        {
          kind: 'mcq',
          prompt: 'Въпрос?',
          options: [{ text: 'Да' }, { text: 'Не', why: 'Не.' }, { text: 'Може', why: 'Не.' }],
          answer: 0,
          explanation: 'Защото.',
          points: 2,
        },
        { kind: 'short', prompt: 'Кога?', accepted: ['1 октомври'], explanation: 'Там.' },
      ],
    })
    const result = evaluateItem(questions, { answers: [0, 'на 1 октомври'] })
    expect([result.score, result.max]).toEqual([2, 3])
    expect(result.parts.map((p) => p.key)).toEqual(['q1', 'q2'])

    const matching = item({
      ...cae,
      id: 'a-006',
      type: 'text_set',
      format: 'matching',
      passages: [
        { id: 'A', text: 'One.' },
        { id: 'B', text: 'Two.' },
      ],
      questions: [
        { kind: 'match', prompt: 'Who?', answer: 'B', explanation: 'B says so.' },
        { kind: 'match', prompt: 'Who else?', answer: 'A', explanation: 'A says so.' },
      ],
    })
    expect(score(matching, { answers: ['b', 'B'] })).toEqual([1, 2])

    const gapped = item({
      ...cae,
      id: 'a-007',
      type: 'text_set',
      format: 'gapped',
      passages: [{ id: 'A', text: 'Start [[1]] middle [[2]] end.' }],
      paragraphs: [
        { key: 'A', text: 'First.' },
        { key: 'B', text: 'Second.' },
        { key: 'C', text: 'Extra.' },
      ],
      gaps: [
        { answer: 'B', explanation: 'Fits.' },
        { answer: 'A', explanation: 'Fits.' },
      ],
    })
    const gaps = evaluateItem(gapped, { answers: ['B', 'C'] })
    expect([gaps.score, gaps.parts.map((p) => p.key)]).toEqual([1, ['g1', 'g2']])
  })

  it('Use of English: избор, open cloze и word formation', () => {
    const mcCloze = item({
      ...cae,
      id: 'a-008',
      type: 'mc_cloze',
      text: 'It [[1]] light on [[2]].',
      gaps: [
        {
          options: [
            { text: 'shed' },
            { text: 'made', why: 'No.' },
            { text: 'gave', why: 'No.' },
            { text: 'put', why: 'No.' },
          ],
          answer: 0,
          explanation: 'Collocation.',
        },
        {
          options: [
            { text: 'a', why: 'No.' },
            { text: 'it' },
            { text: 'on', why: 'No.' },
            { text: 'up', why: 'No.' },
          ],
          answer: 1,
          explanation: 'Object.',
        },
      ],
    })
    expect(score(mcCloze, { choices: [0, 2] })).toEqual([1, 2])

    const open = item({
      ...cae,
      id: 'a-009',
      type: 'open_cloze',
      text: 'It was not [[1]] later.',
      gaps: [{ accepted: ['until', 'till'], explanation: 'Cleft.' }],
    })
    expect(score(open, { answers: ['Till'] })).toEqual([1, 1])

    const formation = item({
      ...cae,
      id: 'a-010',
      type: 'word_formation',
      text: 'It proved [[1]] popular.',
      gaps: [{ stem: 'SURPRISE', accepted: ['surprisingly'], explanation: 'Adverb.' }],
    })
    expect(score(formation, { answers: ['surprising'] })).toEqual([0, 1])
  })

  it('listening: избор, допълване и съпоставяне', () => {
    const listening = item({
      ...cae,
      id: 'a-011',
      type: 'listening_set',
      part: 4,
      title: 'Speakers',
      plays: 2,
      speakers: [{ id: 'one', name: 'One', lang: 'en-GB' }],
      scripts: [{ id: 's1', lines: [{ speaker: 'one', text: 'Hello.' }] }],
      matchingTasks: [
        {
          task: 1,
          prompt: 'Why?',
          options: [
            { key: 'A', text: 'Money' },
            { key: 'B', text: 'Time' },
          ],
        },
      ],
      questions: [
        {
          kind: 'mcq',
          prompt: 'What?',
          options: [{ text: 'x' }, { text: 'y', why: 'No.' }, { text: 'z', why: 'No.' }],
          answer: 0,
          explanation: 'x.',
        },
        {
          kind: 'completion',
          prompt: 'She works as a [[1]].',
          accepted: ['nurse'],
          explanation: 'n.',
        },
        { kind: 'match', task: 1, script: 's1', answer: 'B', explanation: 'Time.' },
      ],
    })
    expect(score(listening, { answers: [0, 'Nurse', 'A'] })).toEqual([2, 3])
  })

  it('писане и говорене: самооценка в границите на критериите', () => {
    const writing = item({
      ...cae,
      id: 'a-012',
      type: 'writing_task',
      genre: 'cae-essay',
      title: 'Essay',
      prompt: 'Write.',
      rubric: 'cae-writing',
      checklist: ['Увод.'],
    })
    const result = evaluateItem(writing, { scores: { content: 4, language: 9 } }, { rubrics })
    expect(result).toMatchObject({ score: 9, max: 10, selfAssessed: true })
    expect(() => evaluateItem(writing, {})).toThrow('Непознати критерии')
  })

  it('липсващ или повреден отговор носи 0 точки', () => {
    const mcq = item({
      ...bel,
      id: 'a-013',
      type: 'mcq',
      prompt: 'Кое?',
      options: [
        { text: 'А' },
        { text: 'Б', why: 'Не.' },
        { text: 'В', why: 'Не.' },
        { text: 'Г', why: 'Не.' },
      ],
      answer: 0,
    })
    expect(score(mcq, null)).toEqual([0, 1])
    expect(score(mcq, { choice: '0' })).toEqual([0, 1])
    expect(evaluateItem(mcq, undefined).correct).toBe(false)
  })
})
