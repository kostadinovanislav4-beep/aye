import { z } from 'zod'

/*
 * Схемите на съдържанието (раздел 4.1 от SPEC). Форматът е описан с примери в content/README.md.
 * Схемите проверяват структурата. Връзките между полетата (верен индекс, маркери, тагове,
 * повторения) проверява validate.ts.
 */

// ——— Основни стойности ———

/** id на колода или елемент: малки латински букви, цифри и единични тирета. */
export const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  error: 'id: само малки латински букви, цифри и единични тирета.',
})

/** Таг: части на латиница, разделени с точка, напр. bel.punct.podchineni. */
export const tagIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/, {
    error: 'Таг: части на латиница, разделени с точка.',
  })

/** Непразен текст. Не се трансформира — съдържанието остава точно както е във файла. */
const text = z.string().refine((value) => value.trim().length > 0, { error: 'Празен текст.' })

/** Фрагмент от текст. Сравнява се буквално, затова и интервалите имат значение. */
const fragment = z.string().min(1, { error: 'Празен фрагмент.' })

/** Буква за вариант, текст или абзац: A, B, C… */
const letter = z.string().regex(/^[A-Z]$/, { error: 'Очаквам една главна латинска буква.' })

/** Вътрешен id (говорител, скрипт): малки латински букви, цифри и тирета. */
const localId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  error: 'Очаквам малки латински букви, цифри и тирета.',
})

const answerIndex = z.number().int().nonnegative()
const points = z.number().int().min(1).max(10)

export const EXAMS = ['bel', 'cae'] as const
export const examSchema = z.enum(EXAMS)
export type Exam = z.infer<typeof examSchema>

/** Вариант на отговор. `why` обяснява защо вариантът е грешен — задължително за всеки грешен. */
export const choiceSchema = z.strictObject({
  text,
  why: text.optional(),
})
export type Choice = z.infer<typeof choiceSchema>

/** Правила за сравняване на свободен отговор (виж src/domain/text/normalize.ts). */
export const normalizeSchema = z.strictObject({
  caseSensitive: z.boolean().optional(),
  keepPunctuation: z.boolean().optional(),
  /** Регулярен израз (JavaScript), който също приема отговора. */
  pattern: text.optional(),
})

// ——— Общи полета ———

const common = {
  id: idSchema,
  exam: examSchema,
  tags: z.array(tagIdSchema).min(1, { error: 'Нужен е поне един таг.' }),
  difficulty: z.number().int().min(1).max(5),
  /** Защо верният отговор е верен. При езиковите норми цитира правилото. */
  explanation: text,
  /** Източник или правило. */
  source: text.optional(),
  /** true само ако елементът е сверен с източник. Всичко останало отива в „За проверка“. */
  verified: z.boolean(),
}

// ——— Карти ———

export const basicSchema = z.strictObject({
  ...common,
  type: z.literal('basic'),
  front: text,
  back: text,
  hint: text.optional(),
  /** Примерно изречение (за лексиката в CAE). */
  example: text.optional(),
})

export const clozeSchema = z.strictObject({
  ...common,
  type: z.literal('cloze'),
  /** Текст с {{c1::отговор}} или {{c1::отговор::подсказка}}. Всяко cN е отделна карта. */
  text,
  /** Контекст под текста, напр. автор и произведение при цитат. */
  context: text.optional(),
})

// ——— Задачи ———

export const mcqSchema = z.strictObject({
  ...common,
  type: z.literal('mcq'),
  prompt: text,
  passage: text.optional(),
  options: z.array(choiceSchema).min(4).max(5),
  /** Индексът на верния вариант (от 0). */
  answer: answerIndex,
})

export const shortSchema = z.strictObject({
  ...common,
  type: z.literal('short'),
  prompt: text,
  passage: text.optional(),
  accepted: z.array(text).min(1),
  normalize: normalizeSchema.optional(),
})

export const editErrorSchema = z.strictObject({
  /** Грешният фрагмент точно както е в текста. */
  fragment,
  /** Кое срещане на фрагмента е грешката (по подразбиране първото). */
  occurrence: z.number().int().min(1).optional(),
  /** Приетите поправки на фрагмента. */
  accepted: z.array(fragment).min(1),
  tag: tagIdSchema,
  note: text.optional(),
})

export const editTextSchema = z.strictObject({
  ...common,
  type: z.literal('edit_text'),
  prompt: text,
  text,
  errors: z.array(editErrorSchema).min(1),
})

// ——— Текст с въпроси (БЕЛ „работа с текст“, CAE Reading части 5–8) ———

export const passageSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9]+$/, { error: 'id на текст: латински букви и цифри.' }),
  title: text.optional(),
  text,
  source: text.optional(),
})

const setMcqSchema = z.strictObject({
  kind: z.literal('mcq'),
  prompt: text,
  options: z.array(choiceSchema).min(3).max(5),
  answer: answerIndex,
  explanation: text,
  points: points.optional(),
})

const setShortSchema = z.strictObject({
  kind: z.literal('short'),
  prompt: text,
  accepted: z.array(text).min(1),
  normalize: normalizeSchema.optional(),
  explanation: text,
  points: points.optional(),
})

/** Въпрос, чийто отговор е id на текст (cross-text и multiple matching). */
const setMatchSchema = z.strictObject({
  kind: z.literal('match'),
  prompt: text,
  answer: z.string().min(1),
  explanation: text,
  points: points.optional(),
})

const textSetCommon = {
  ...common,
  type: z.literal('text_set'),
  title: text.optional(),
  instructions: text.optional(),
  passages: z.array(passageSchema).min(1),
}

export const textSetSchema = z.discriminatedUnion('format', [
  z.strictObject({
    ...textSetCommon,
    format: z.literal('questions'),
    questions: z.array(z.discriminatedUnion('kind', [setMcqSchema, setShortSchema])).min(1),
  }),
  z.strictObject({
    ...textSetCommon,
    format: z.literal('cross_text'),
    questions: z.array(setMatchSchema).min(1),
  }),
  z.strictObject({
    ...textSetCommon,
    format: z.literal('gapped'),
    /** Извадените абзаци; на изпита са с един повече от празните места. */
    paragraphs: z.array(z.strictObject({ key: letter, text })).min(2),
    /** По един отговор за всеки маркер [[n]] в първия текст. */
    gaps: z.array(z.strictObject({ answer: letter, explanation: text })).min(1),
  }),
  z.strictObject({
    ...textSetCommon,
    format: z.literal('matching'),
    questions: z.array(setMatchSchema).min(1),
  }),
])

// ——— Use of English (CAE части 1–4) ———

export const mcClozeSchema = z.strictObject({
  ...common,
  type: z.literal('mc_cloze'),
  title: text.optional(),
  /** Текст с маркери [[1]], [[2]] … */
  text,
  gaps: z
    .array(
      z.strictObject({
        options: z.array(choiceSchema).length(4),
        answer: answerIndex,
        explanation: text,
      }),
    )
    .min(1),
})

export const openClozeSchema = z.strictObject({
  ...common,
  type: z.literal('open_cloze'),
  title: text.optional(),
  text,
  gaps: z.array(z.strictObject({ accepted: z.array(text).min(1), explanation: text })).min(1),
})

export const wordFormationSchema = z.strictObject({
  ...common,
  type: z.literal('word_formation'),
  title: text.optional(),
  text,
  gaps: z
    .array(
      z.strictObject({
        /** Коренната дума, както е дадена на изпита (с главни букви). */
        stem: text,
        accepted: z.array(text).min(1),
        explanation: text,
      }),
    )
    .min(1),
})

const kwtPartSchema = z.strictObject({ accepted: z.array(text).min(1) })

export const kwtSchema = z.strictObject({
  ...common,
  type: z.literal('kwt'),
  sentence: text,
  keyword: text,
  /** Второто изречение с празно място [[1]]. */
  gapped: text,
  /** Пълните приети отговори (2 точки). */
  answers: z.array(text).min(1),
  /** Двете части, всяка по 1 точка, за частичното точкуване. */
  parts: z.tuple([kwtPartSchema, kwtPartSchema]),
})

// ——— Listening ———

export const SPEECH_LANGS = [
  'en-GB',
  'en-US',
  'en-AU',
  'en-CA',
  'en-IE',
  'en-NZ',
  'en-ZA',
  'en-IN',
] as const

export const speakerSchema = z.strictObject({
  id: localId,
  name: text,
  lang: z.enum(SPEECH_LANGS),
  /** Предпочитан глас; приложението избира най-близкия от наличните в браузъра. */
  voice: z.enum(['female', 'male']).optional(),
  rate: z.number().min(0.5).max(1.5).optional(),
})

export const scriptSchema = z.strictObject({
  id: localId,
  title: text.optional(),
  /** Изречението, с което се въвежда записът (както на изпита). */
  intro: text.optional(),
  lines: z.array(z.strictObject({ speaker: localId, text })).min(1),
})

const listenMcqSchema = z.strictObject({
  kind: z.literal('mcq'),
  script: localId.optional(),
  prompt: text,
  options: z.array(choiceSchema).min(3).max(4),
  answer: answerIndex,
  explanation: text,
})

const listenCompletionSchema = z.strictObject({
  kind: z.literal('completion'),
  script: localId.optional(),
  /** Изречение с празно място [[1]]. */
  prompt: text,
  accepted: z.array(text).min(1),
  explanation: text,
})

const listenMatchSchema = z.strictObject({
  kind: z.literal('match'),
  task: z.number().int().min(1).max(2),
  script: localId,
  answer: letter,
  explanation: text,
})

export const listeningSetSchema = z.strictObject({
  ...common,
  type: z.literal('listening_set'),
  part: z.number().int().min(1).max(4),
  title: text,
  instructions: text.optional(),
  /** Колко пъти се чува записът. */
  plays: z.number().int().min(1).max(3),
  speakers: z.array(speakerSchema).min(1),
  scripts: z.array(scriptSchema).min(1),
  /** Задачите за multiple matching (част 4). */
  matchingTasks: z
    .array(
      z.strictObject({
        task: z.number().int().min(1).max(2),
        prompt: text,
        options: z.array(z.strictObject({ key: letter, text })).min(2),
      }),
    )
    .optional(),
  questions: z
    .array(
      z.discriminatedUnion('kind', [listenMcqSchema, listenCompletionSchema, listenMatchSchema]),
    )
    .min(1),
})

// ——— Speaking и Writing ———

export const speakingTaskSchema = z.strictObject({
  ...common,
  type: z.literal('speaking_task'),
  part: z.number().int().min(1).max(4),
  title: text,
  instructions: text,
  questions: z.array(text).min(1),
  /** Сцена за част 2 или 3: описание с текст или прост SVG. */
  scene: z.strictObject({ description: text, svg: text.optional() }).optional(),
  timers: z
    .array(z.strictObject({ label: text, seconds: z.number().int().min(5).max(900) }))
    .min(1),
  sampleAnswers: z.array(z.strictObject({ text, note: text.optional() })).min(1),
  usefulPhrases: z.array(text).min(1),
  /** Реплики на симулирания партньор. */
  partnerLines: z.array(text).optional(),
  /** id от content/rubrics.json. */
  rubric: idSchema,
})

export const WRITING_GENRES = [
  'bel-essay',
  'bel-interpretive',
  'cae-essay',
  'cae-letter',
  'cae-email',
  'cae-proposal',
  'cae-report',
  'cae-review',
] as const

const annotationSchema = z.strictObject({
  /** Цитат от примерния текст, точно както е в него. */
  fragment,
  comment: text,
  kind: z.enum(['strong', 'weak']),
})

export const writingTaskSchema = z.strictObject({
  ...common,
  type: z.literal('writing_task'),
  genre: z.enum(WRITING_GENRES),
  title: text,
  prompt: text,
  targetWords: z
    .strictObject({ min: z.number().int().min(1), max: z.number().int().min(1) })
    .optional(),
  minutes: z.number().int().min(1).max(240).optional(),
  /** id от content/rubrics.json. */
  rubric: idSchema,
  checklist: z.array(text).min(1),
  /** Теза и план на аргументите (за темите на задача 41). */
  plan: z.strictObject({ thesis: text, points: z.array(text).min(1) }).optional(),
  samples: z
    .array(
      z.strictObject({
        level: z.enum(['strong', 'average']),
        text,
        annotations: z.array(annotationSchema).min(1),
        summary: text.optional(),
      }),
    )
    .optional(),
  phrases: z.array(z.strictObject({ group: text, items: z.array(text).min(1) })).optional(),
})

// ——— Елемент, колода и служебни файлове ———

export const itemSchema = z.discriminatedUnion('type', [
  basicSchema,
  clozeSchema,
  mcqSchema,
  shortSchema,
  editTextSchema,
  textSetSchema,
  mcClozeSchema,
  openClozeSchema,
  wordFormationSchema,
  kwtSchema,
  listeningSetSchema,
  speakingTaskSchema,
  writingTaskSchema,
])

export type ContentItem = z.infer<typeof itemSchema>
export type ItemType = ContentItem['type']
export type ItemOfType<T extends ItemType> = Extract<ContentItem, { type: T }>

export const ITEM_TYPES = [
  'basic',
  'cloze',
  'mcq',
  'short',
  'edit_text',
  'text_set',
  'mc_cloze',
  'open_cloze',
  'word_formation',
  'kwt',
  'listening_set',
  'speaking_task',
  'writing_task',
] as const satisfies readonly ItemType[]

export const deckSchema = z.strictObject({
  id: idSchema,
  title: text,
  exam: examSchema,
  area: idSchema,
  description: text.optional(),
})

/** Един файл в content/<изпит>/<област>/ е една колода. */
export const deckFileSchema = z.strictObject({
  deck: deckSchema,
  items: z.array(itemSchema).min(1),
})
export type DeckFile = z.infer<typeof deckFileSchema>

export const tagsFileSchema = z.strictObject({
  tags: z
    .array(z.strictObject({ id: tagIdSchema, label: text, description: text.optional() }))
    .min(1),
})

export const rubricsFileSchema = z.strictObject({
  rubrics: z
    .array(
      z.strictObject({
        id: idSchema,
        exam: examSchema,
        title: text,
        criteria: z
          .array(
            z.strictObject({
              id: z.string().min(1),
              name: text,
              max: z.number().int().min(1),
              group: text.optional(),
              description: text.optional(),
            }),
          )
          .min(1),
        source: text.optional(),
        verified: z.boolean(),
      }),
    )
    .min(1),
})
