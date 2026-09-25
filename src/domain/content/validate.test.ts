import { describe, expect, it } from 'vitest'
import { validateContent, type ContentFile, type ValidationReport } from './validate'

const tags: ContentFile = {
  path: 'content/tags.json',
  data: {
    tags: [
      { id: 'bel', label: 'БЕЛ' },
      { id: 'bel.punct', label: 'Пунктуация' },
      { id: 'bel.punct.podchineni', label: 'Подчинени изречения' },
      { id: 'bel.gram', label: 'Граматика' },
      { id: 'bel.gram.chlen', label: 'Член' },
      { id: 'cae', label: 'C1 Advanced' },
      { id: 'cae.uoe', label: 'Use of English' },
      { id: 'cae.uoe.part2', label: 'Open cloze' },
      { id: 'cae.uoe.part4', label: 'Key word transformations' },
      { id: 'cae.writing', label: 'Writing' },
    ],
  },
}

const rubrics: ContentFile = {
  path: 'content/rubrics.json',
  data: {
    rubrics: [
      {
        id: 'cae-writing',
        exam: 'cae',
        title: 'Writing',
        criteria: [{ id: 'content', name: 'Content', max: 5 }],
        verified: false,
      },
    ],
  },
}

function mcq(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bel-punct-podchineni-001',
    type: 'mcq',
    exam: 'bel',
    tags: ['bel.punct.podchineni'],
    difficulty: 2,
    prompt: 'В кое изречение е допусната пунктуационна грешка?',
    options: [
      { text: 'Знам, че си тук.', why: 'Запетаята е пред „че“ — правилно.' },
      { text: 'Мисля че, си прав.' },
      { text: 'Когато дойдеш, ще говорим.', why: 'Подчиненото изречение е отделено — правилно.' },
      { text: 'Книгата, която четеш, е хубава.', why: 'Отделено от двете страни — правилно.' },
    ],
    answer: 1,
    explanation: 'Запетаята се поставя пред съюза „че“, а не след него.',
    verified: true,
    ...overrides,
  }
}

function deck(items: unknown[], path = 'content/bel/punct/test.json', exam = 'bel'): ContentFile {
  const id = path.split('/').pop()?.replace('.json', '') ?? 'test'
  return { path, data: { deck: { id, title: 'Тест', exam, area: 'test' }, items } }
}

function run(...decks: ContentFile[]): ValidationReport {
  return validateContent({ decks, tags, rubrics })
}

const errors = (report: ValidationReport) =>
  report.issues.filter((issue) => issue.level === 'error').map((issue) => issue.message)

describe('validateContent', () => {
  it('приема правилна колода и брои елементите', () => {
    const report = run(
      deck([
        mcq(),
        mcq({ id: 'bel-punct-podchineni-002', verified: false, prompt: 'Друго условие?' }),
      ]),
    )
    expect(errors(report)).toEqual([])
    expect(report.items).toBe(2)
    expect(report.byExam.bel).toBe(2)
    expect(report.unverified).toEqual([
      { id: 'bel-punct-podchineni-002', file: 'content/bel/punct/test.json' },
    ])
  })

  it('открива повторен id в различни файлове', () => {
    const report = run(
      deck([mcq()]),
      deck([mcq({ prompt: 'Съвсем друго условие?' })], 'content/bel/punct/other.json'),
    )
    expect(errors(report).some((message) => message.startsWith('id вече има'))).toBe(true)
  })

  it('открива повторено условие след нормализиране', () => {
    const report = run(
      deck([
        mcq(),
        mcq({
          id: 'bel-punct-podchineni-002',
          prompt: 'в кое изречение е допусната пунктуационна грешка',
        }),
      ]),
    )
    expect(errors(report).some((message) => message.startsWith('Повтаря условието'))).toBe(true)
  })

  it('изисква верен индекс и обяснение за всеки грешен вариант', () => {
    const report = run(deck([mcq({ answer: 4 })]))
    const messages = errors(report)
    expect(messages.some((message) => message.includes('индекс 4'))).toBe(true)
    expect(messages.some((message) => message.includes('липсва обяснение'))).toBe(true)
  })

  it('отхвърля непознат таг и таг без родител', () => {
    expect(errors(run(deck([mcq({ tags: ['bel.punct.nyama'] })]))).join()).toContain('Непознат таг')
    const orphan = validateContent({
      decks: [],
      tags: { path: 'content/tags.json', data: { tags: [{ id: 'bel.punct', label: 'x' }] } },
      rubrics,
    })
    expect(errors(orphan).join()).toContain('няма родител')
  })

  it('съобщава за грешка в схемата с мястото ѝ', () => {
    const { verified: _omitted, ...broken } = mcq()
    const report = run(deck([broken]))
    expect(report.issues.some((issue) => issue.where === 'items[0].verified')).toBe(true)
  })

  it('открива елемент от друг изпит в колодата', () => {
    const report = run(deck([mcq()], 'content/cae/uoe/test.json', 'cae'))
    expect(errors(report).join()).toContain('а колодата')
  })

  it('проверява празните места в open cloze', () => {
    const item = {
      id: 'cae-uoe-part2-001',
      type: 'open_cloze',
      exam: 'cae',
      tags: ['cae.uoe.part2'],
      difficulty: 3,
      text: 'It was not [[1]] later that [[3]] …',
      gaps: [
        { accepted: ['until'], explanation: '…' },
        { accepted: ['we'], explanation: '…' },
      ],
      explanation: 'Open cloze.',
      verified: false,
    }
    expect(errors(run(deck([item], 'content/cae/uoe/test.json', 'cae'))).join()).toContain(
      'Очаквам маркерите',
    )
  })

  it('проверява броя думи и ключовата дума в KWT', () => {
    const item = {
      id: 'cae-uoe-part4-001',
      type: 'kwt',
      exam: 'cae',
      tags: ['cae.uoe.part4'],
      difficulty: 3,
      sentence: 'People say that the castle was built in the 12th century.',
      keyword: 'SAID',
      gapped: 'The castle [[1]] been built in the 12th century.',
      answers: ['is thought to have', 'is widely said by many people to have'],
      parts: [{ accepted: ['is said'] }, { accepted: ['to have'] }],
      explanation: 'Passive with reporting verbs.',
      verified: false,
    }
    const messages = errors(run(deck([item], 'content/cae/uoe/test.json', 'cae')))
    expect(messages.some((message) => message.includes('не съдържа ключовата дума'))).toBe(true)
    expect(messages.some((message) => message.includes('от 8 думи'))).toBe(true)
  })

  it('проверява фрагментите при редактиране', () => {
    const item = {
      id: 'bel-redaktirane-001',
      type: 'edit_text',
      exam: 'bel',
      tags: ['bel.gram.chlen'],
      difficulty: 2,
      prompt: 'Поправете грешките.',
      text: 'Видях приятелят си вчера.',
      errors: [
        { fragment: 'приятелят', accepted: ['приятеля'], tag: 'bel.gram.chlen' },
        { fragment: 'приятелят си', accepted: ['приятеля си'], tag: 'bel.gram.chlen' },
        { fragment: 'утре', accepted: ['вчера'], tag: 'bel.gram.chlen' },
      ],
      explanation: 'Кратък член при допълнение.',
      verified: false,
    }
    const messages = errors(run(deck([item])))
    expect(messages.some((message) => message.includes('не се среща'))).toBe(true)
    expect(messages.some((message) => message.includes('се застъпват'))).toBe(true)
  })

  it('изисква познати критерии за писане', () => {
    const item = {
      id: 'cae-writing-essay-001',
      type: 'writing_task',
      exam: 'cae',
      tags: ['cae.writing'],
      difficulty: 3,
      genre: 'cae-essay',
      title: 'Essay',
      prompt: 'Write an essay.',
      rubric: 'nyama-takiva',
      checklist: ['Има увод.'],
      explanation: 'Essay.',
      verified: false,
    }
    expect(errors(run(deck([item], 'content/cae/writing/test.json', 'cae'))).join()).toContain(
      'Непознати критерии',
    )
  })

  it('предупреждава при изкривено разпределение на трудността', () => {
    const items = Array.from({ length: 25 }, (_, i) =>
      mcq({ id: `bel-punct-podchineni-${100 + i}`, prompt: `Условие ${i}?`, difficulty: 5 }),
    )
    const report = run(deck(items))
    expect(errors(report)).toEqual([])
    expect(report.issues.some((issue) => issue.message.startsWith('Трудността се отклонява'))).toBe(
      true,
    )
  })
})
