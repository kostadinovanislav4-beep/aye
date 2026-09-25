import { normalizeAnswer } from '../text/normalize'
import {
  checkGapMarkers,
  containsWord,
  countKwtWords,
  gapNumbers,
  hasStrayClozeBraces,
  parseCloze,
  stripMarkup,
} from './markers'
import {
  EXAMS,
  deckFileSchema,
  rubricsFileSchema,
  tagsFileSchema,
  type Choice,
  type ContentItem,
  type Exam,
  type ItemOfType,
} from './schema'

export type IssueLevel = 'error' | 'warning'

export type ValidationIssue = {
  level: IssueLevel
  /** Файлът, напр. content/bel/punct/podchineni.json. */
  file: string
  /** Мястото във файла, напр. items[3] (bel-punct-podchineni-004). */
  where?: string
  message: string
}

export type ContentFile = { path: string; data: unknown }

export type ValidationInput = {
  decks: readonly ContentFile[]
  tags: ContentFile
  rubrics: ContentFile
}

export type ValidationReport = {
  issues: ValidationIssue[]
  decks: number
  items: number
  byExam: Record<Exam, number>
  byType: Record<string, number>
  /** Елементите с verified: false — те отиват в „За проверка“. */
  unverified: { id: string; file: string }[]
}

/** Целевото разпределение на трудността за нива 1–5 (раздел 6.3 от SPEC). */
export const TARGET_DIFFICULTY = [0.2, 0.3, 0.3, 0.15, 0.05] as const
/** Под този брой елементи в изпит разпределението не се проверява. */
export const DIFFICULTY_MIN_ITEMS = 20
/** Допустимо отклонение за всяко ниво (в дял от 1). */
export const DIFFICULTY_TOLERANCE = 0.15
/** Над този брой елементи във файл има предупреждение (целта е около 50). */
export const MAX_ITEMS_PER_FILE = 60

type Findings = { errors: string[]; warnings: string[] }
type Context = { tagIds: ReadonlySet<string>; rubricIds: ReadonlySet<string> }

function formatPath(path: readonly PropertyKey[]): string {
  return path
    .map((part, i) =>
      typeof part === 'number' ? `[${part}]` : `${i === 0 ? '' : '.'}${String(part)}`,
    )
    .join('')
}

function short(value: string, max = 40): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function percent(share: number): string {
  return `${Math.round(share * 100)} %`
}

// ——— Служебни файлове ———

function collectTags(file: ContentFile, issues: ValidationIssue[]): Set<string> {
  const ids = new Set<string>()
  const parsed = tagsFileSchema.safeParse(file.data)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        level: 'error',
        file: file.path,
        where: formatPath(issue.path),
        message: issue.message,
      })
    }
    return ids
  }
  for (const tag of parsed.data.tags) {
    if (ids.has(tag.id)) {
      issues.push({
        level: 'error',
        file: file.path,
        message: `Тагът „${tag.id}“ е записан два пъти.`,
      })
    }
    ids.add(tag.id)
  }
  for (const id of ids) {
    const dot = id.lastIndexOf('.')
    if (dot > 0 && !ids.has(id.slice(0, dot))) {
      issues.push({
        level: 'error',
        file: file.path,
        message: `Тагът „${id}“ няма родител „${id.slice(0, dot)}“.`,
      })
    }
  }
  return ids
}

function collectRubrics(file: ContentFile, issues: ValidationIssue[]): Set<string> {
  const ids = new Set<string>()
  const parsed = rubricsFileSchema.safeParse(file.data)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        level: 'error',
        file: file.path,
        where: formatPath(issue.path),
        message: issue.message,
      })
    }
    return ids
  }
  for (const rubric of parsed.data.rubrics) {
    if (ids.has(rubric.id)) {
      issues.push({
        level: 'error',
        file: file.path,
        message: `Критериите „${rubric.id}“ са записани два пъти.`,
      })
    }
    ids.add(rubric.id)
  }
  return ids
}

// ——— Проверки по тип ———

function checkChoices(
  options: readonly Choice[],
  answer: number,
  label: string,
  f: Findings,
): void {
  if (answer >= options.length) {
    f.errors.push(
      `${label}: верният отговор е с индекс ${answer}, а вариантите са ${options.length} (индексите започват от 0).`,
    )
  }
  options.forEach((option, i) => {
    if (i !== answer && !option.why) {
      f.errors.push(
        `${label}: липсва обяснение (why) защо вариантът „${short(option.text)}“ е грешен.`,
      )
    }
  })
  const seen = new Set<string>()
  for (const option of options) {
    const key = normalizeAnswer(option.text)
    if (seen.has(key)) f.errors.push(`${label}: вариантът „${short(option.text)}“ се повтаря.`)
    seen.add(key)
  }
}

function checkPattern(pattern: string | undefined, label: string, f: Findings): void {
  if (pattern === undefined) return
  try {
    new RegExp(pattern, 'u')
  } catch {
    f.errors.push(`${label}: невалиден регулярен израз „${pattern}“.`)
  }
}

function checkGapText(text: string, count: number, f: Findings): void {
  const problem = checkGapMarkers(text, count)
  if (problem) f.errors.push(problem)
}

function nthIndexOf(haystack: string, needle: string, n: number): number {
  let from = 0
  let found = 0
  while (found < n) {
    const at = haystack.indexOf(needle, from)
    if (at < 0) return -1
    found += 1
    if (found === n) return at
    from = at + needle.length
  }
  return -1
}

function checkEditText(item: ItemOfType<'edit_text'>, ctx: Context, f: Findings): void {
  const spans: { start: number; end: number; fragment: string }[] = []
  item.errors.forEach((error, i) => {
    const label = `Грешка ${i + 1}`
    const occurrence = error.occurrence ?? 1
    const start = nthIndexOf(item.text, error.fragment, occurrence)
    if (start < 0) {
      const times = occurrence === 1 ? '' : ` ${occurrence} пъти`
      f.errors.push(`${label}: фрагментът „${error.fragment}“ не се среща${times} в текста.`)
    } else {
      spans.push({ start, end: start + error.fragment.length, fragment: error.fragment })
    }
    if (error.accepted.includes(error.fragment)) {
      f.errors.push(`${label}: една от поправките е същата като грешния фрагмент.`)
    }
    if (!ctx.tagIds.has(error.tag)) f.errors.push(`${label}: непознат таг „${error.tag}“.`)
    if (error.fragment !== error.fragment.trim()) {
      f.warnings.push(`${label}: фрагментът започва или завършва с интервал.`)
    }
  })
  spans.sort((a, b) => a.start - b.start)
  spans.forEach((span, i) => {
    const previous = spans[i - 1]
    if (previous && span.start < previous.end) {
      f.errors.push(`Фрагментите „${previous.fragment}“ и „${span.fragment}“ се застъпват.`)
    }
  })
}

function checkTextSet(item: ItemOfType<'text_set'>, f: Findings): void {
  const passageIds = new Set(item.passages.map((passage) => passage.id))
  if (passageIds.size !== item.passages.length) f.errors.push('Има текстове с еднакъв id.')

  switch (item.format) {
    case 'questions':
      item.questions.forEach((question, i) => {
        const label = `Въпрос ${i + 1}`
        if (question.kind === 'mcq') checkChoices(question.options, question.answer, label, f)
        else checkPattern(question.normalize?.pattern, label, f)
      })
      break
    case 'cross_text':
    case 'matching':
      item.questions.forEach((question, i) => {
        if (!passageIds.has(question.answer)) {
          f.errors.push(`Въпрос ${i + 1}: отговорът „${question.answer}“ не е id на текст.`)
        }
      })
      break
    case 'gapped': {
      const base = item.passages[0]
      if (base) checkGapText(base.text, item.gaps.length, f)
      const keys = new Set(item.paragraphs.map((paragraph) => paragraph.key))
      if (keys.size !== item.paragraphs.length) f.errors.push('Има абзаци с еднаква буква.')
      const used = new Set<string>()
      item.gaps.forEach((gap, i) => {
        if (!keys.has(gap.answer))
          f.errors.push(`Празно място ${i + 1}: няма абзац „${gap.answer}“.`)
        if (used.has(gap.answer)) {
          f.errors.push(`Абзац „${gap.answer}“ е отговор на повече от едно празно място.`)
        }
        used.add(gap.answer)
      })
      if (item.paragraphs.length !== item.gaps.length + 1) {
        f.warnings.push(
          `На изпита абзаците са с един повече от празните места, а тук са ${item.paragraphs.length} за ${item.gaps.length} места.`,
        )
      }
      break
    }
  }
}

function checkKwt(item: ItemOfType<'kwt'>, f: Findings): void {
  const markers = gapNumbers(item.gapped)
  if (markers.length !== 1 || markers[0] !== 1) {
    f.errors.push('Второто изречение трябва да има точно едно празно място [[1]].')
  }
  for (const answer of item.answers) {
    const words = countKwtWords(answer)
    if (words < 3 || words > 6) {
      f.errors.push(
        `Отговорът „${answer}“ е от ${words} думи, а трябва да е от 3 до 6 (съкратените форми се броят за две думи).`,
      )
    }
    if (!containsWord(answer, item.keyword)) {
      f.errors.push(`Отговорът „${answer}“ не съдържа ключовата дума „${item.keyword}“.`)
    }
  }
  item.parts.forEach((part, i) => {
    const found = part.accepted.some((variant) =>
      item.answers.some((answer) => normalizeAnswer(answer).includes(normalizeAnswer(variant))),
    )
    if (!found)
      f.warnings.push(`Част ${i + 1}: нито един от вариантите не се среща в пълните отговори.`)
  })
  if (item.keyword !== item.keyword.toUpperCase()) {
    f.warnings.push('Ключовата дума се пише с главни букви, както на изпита.')
  }
}

function checkListening(item: ItemOfType<'listening_set'>, f: Findings): void {
  const speakerIds = new Set(item.speakers.map((speaker) => speaker.id))
  const scriptIds = new Set(item.scripts.map((script) => script.id))
  if (speakerIds.size !== item.speakers.length) f.errors.push('Има говорители с еднакъв id.')
  if (scriptIds.size !== item.scripts.length) f.errors.push('Има скриптове с еднакъв id.')

  for (const script of item.scripts) {
    script.lines.forEach((line, i) => {
      if (!speakerIds.has(line.speaker)) {
        f.errors.push(
          `Скрипт „${script.id}“, реплика ${i + 1}: непознат говорител „${line.speaker}“.`,
        )
      }
    })
  }

  const tasks = new Map(
    (item.matchingTasks ?? []).map((task) => [task.task, new Set(task.options.map((o) => o.key))]),
  )

  item.questions.forEach((question, i) => {
    const label = `Въпрос ${i + 1}`
    if (question.script !== undefined && !scriptIds.has(question.script)) {
      f.errors.push(`${label}: няма скрипт „${question.script}“.`)
    }
    switch (question.kind) {
      case 'mcq':
        checkChoices(question.options, question.answer, label, f)
        break
      case 'completion':
        if (gapNumbers(question.prompt).length !== 1) {
          f.errors.push(`${label}: изречението трябва да има точно едно празно място [[1]].`)
        }
        break
      case 'match': {
        const keys = tasks.get(question.task)
        if (!keys) f.errors.push(`${label}: няма задача ${question.task} в matchingTasks.`)
        else if (!keys.has(question.answer)) {
          f.errors.push(`${label}: „${question.answer}“ не е вариант в задача ${question.task}.`)
        }
        break
      }
    }
  })
}

function checkWriting(item: ItemOfType<'writing_task'>, ctx: Context, f: Findings): void {
  if (!ctx.rubricIds.has(item.rubric)) f.errors.push(`Непознати критерии „${item.rubric}“.`)
  if (item.targetWords && item.targetWords.min > item.targetWords.max) {
    f.errors.push('targetWords: min е по-голямо от max.')
  }
  item.samples?.forEach((sample, i) => {
    sample.annotations.forEach((annotation, j) => {
      if (!sample.text.includes(annotation.fragment)) {
        f.errors.push(
          `Примерен текст ${i + 1}, анотация ${j + 1}: фрагментът не се среща в текста.`,
        )
      }
    })
  })
}

function checkItem(item: ContentItem, ctx: Context): Findings {
  const f: Findings = { errors: [], warnings: [] }

  for (const tag of item.tags) {
    if (!ctx.tagIds.has(tag))
      f.errors.push(`Непознат таг „${tag}“ (добави го в content/tags.json).`)
  }
  if (!item.tags.some((tag) => tag === item.exam || tag.startsWith(`${item.exam}.`))) {
    f.warnings.push(`Нито един таг не е от „${item.exam}.*“.`)
  }

  switch (item.type) {
    case 'basic':
      break
    case 'cloze': {
      const deletions = parseCloze(item.text)
      if (deletions.length === 0) f.errors.push('Няма нито едно изтриване {{c1::…}}.')
      if (deletions.some((deletion) => deletion.answer.trim() === '')) {
        f.errors.push('Има празно изтриване.')
      }
      if (hasStrayClozeBraces(item.text)) f.errors.push('Има незатворени или излишни {{ }}.')
      break
    }
    case 'mcq':
      checkChoices(item.options, item.answer, 'Отговори', f)
      break
    case 'short':
      checkPattern(item.normalize?.pattern, 'Нормализация', f)
      break
    case 'edit_text':
      checkEditText(item, ctx, f)
      break
    case 'text_set':
      checkTextSet(item, f)
      break
    case 'mc_cloze':
      checkGapText(item.text, item.gaps.length, f)
      item.gaps.forEach((gap, i) =>
        checkChoices(gap.options, gap.answer, `Празно място ${i + 1}`, f),
      )
      break
    case 'open_cloze':
    case 'word_formation':
      checkGapText(item.text, item.gaps.length, f)
      break
    case 'kwt':
      checkKwt(item, f)
      break
    case 'listening_set':
      checkListening(item, f)
      break
    case 'speaking_task':
      if (!ctx.rubricIds.has(item.rubric)) f.errors.push(`Непознати критерии „${item.rubric}“.`)
      break
    case 'writing_task':
      checkWriting(item, ctx, f)
      break
  }
  return f
}

/** Текстът, по който се търсят повторени условия. */
function stemOf(item: ContentItem): string {
  switch (item.type) {
    case 'basic':
      return item.front
    case 'cloze':
    case 'edit_text':
    case 'mc_cloze':
    case 'open_cloze':
    case 'word_formation':
      return item.text
    case 'mcq':
      return [item.prompt, item.passage ?? '', ...item.options.map((option) => option.text)].join(
        ' | ',
      )
    case 'short':
      return [item.prompt, item.passage ?? ''].join(' | ')
    case 'text_set':
      return item.passages.map((passage) => passage.text).join(' | ')
    case 'kwt':
      return `${item.sentence} | ${item.keyword}`
    case 'listening_set':
      return item.scripts.flatMap((script) => script.lines.map((line) => line.text)).join(' | ')
    case 'speaking_task':
      return [item.title, ...item.questions].join(' | ')
    case 'writing_task':
      return item.prompt
  }
}

// ——— Входна точка ———

export function validateContent({ decks, tags, rubrics }: ValidationInput): ValidationReport {
  const issues: ValidationIssue[] = []
  const ctx: Context = {
    tagIds: collectTags(tags, issues),
    rubricIds: collectRubrics(rubrics, issues),
  }

  const report: ValidationReport = {
    issues,
    decks: 0,
    items: 0,
    byExam: { bel: 0, cae: 0 },
    byType: {},
    unverified: [],
  }
  const deckIds = new Map<string, string>()
  const itemIds = new Map<string, string>()
  const stems = new Map<string, { id: string; file: string }[]>()
  const difficulty: Record<Exam, number[]> = { bel: [0, 0, 0, 0, 0], cae: [0, 0, 0, 0, 0] }

  for (const file of decks) {
    const parsed = deckFileSchema.safeParse(file.data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({
          level: 'error',
          file: file.path,
          where: formatPath(issue.path),
          message: issue.message,
        })
      }
      continue
    }

    const { deck, items } = parsed.data
    report.decks += 1

    const deckOwner = deckIds.get(deck.id)
    if (deckOwner) {
      issues.push({
        level: 'error',
        file: file.path,
        message: `Колода „${deck.id}“ вече има в ${deckOwner}.`,
      })
    } else {
      deckIds.set(deck.id, file.path)
    }
    if (items.length > MAX_ITEMS_PER_FILE) {
      issues.push({
        level: 'warning',
        file: file.path,
        message: `Файлът има ${items.length} елемента; препоръчително е около 50.`,
      })
    }

    items.forEach((item, index) => {
      const where = `items[${index}] (${item.id})`
      report.items += 1
      report.byExam[item.exam] += 1
      report.byType[item.type] = (report.byType[item.type] ?? 0) + 1
      const levels = difficulty[item.exam]
      levels[item.difficulty - 1] = (levels[item.difficulty - 1] ?? 0) + 1
      if (!item.verified) report.unverified.push({ id: item.id, file: file.path })

      const owner = itemIds.get(item.id)
      if (owner)
        issues.push({ level: 'error', file: file.path, where, message: `id вече има в ${owner}.` })
      else itemIds.set(item.id, file.path)

      if (item.exam !== deck.exam) {
        issues.push({
          level: 'error',
          file: file.path,
          where,
          message: `Елементът е за „${item.exam}“, а колодата — за „${deck.exam}“.`,
        })
      }

      const key = `${item.exam}|${item.type}|${normalizeAnswer(stripMarkup(stemOf(item)))}`
      stems.set(key, [...(stems.get(key) ?? []), { id: item.id, file: file.path }])

      const findings = checkItem(item, ctx)
      for (const message of findings.errors)
        issues.push({ level: 'error', file: file.path, where, message })
      for (const message of findings.warnings)
        issues.push({ level: 'warning', file: file.path, where, message })
    })
  }

  for (const group of stems.values()) {
    if (group.length < 2) continue
    const [first, ...rest] = group
    if (!first) continue
    for (const duplicate of rest) {
      issues.push({
        level: 'error',
        file: duplicate.file,
        where: duplicate.id,
        message: `Повтаря условието на „${first.id}“ (${first.file}).`,
      })
    }
  }

  for (const exam of EXAMS) {
    const counts = difficulty[exam]
    const total = counts.reduce((sum, n) => sum + n, 0)
    if (total < DIFFICULTY_MIN_ITEMS) continue
    const off = TARGET_DIFFICULTY.flatMap((target, i) => {
      const actual = (counts[i] ?? 0) / total
      return Math.abs(actual - target) > DIFFICULTY_TOLERANCE
        ? [`ниво ${i + 1}: ${percent(actual)} при цел ${percent(target)}`]
        : []
    })
    if (off.length > 0) {
      issues.push({
        level: 'warning',
        file: `content/${exam}`,
        message: `Трудността се отклонява от 20/30/30/15/5 % — ${off.join('; ')}.`,
      })
    }
  }

  return report
}
