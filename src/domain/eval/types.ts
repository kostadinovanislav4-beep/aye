import type { ItemType } from '../content/schema'

/*
 * Отговорите по типове елементи. Пазят се в `attempts.response` и `exams.answers` като JSON,
 * затова са прости обекти. null — въпросът е пропуснат.
 */
export type Responses = {
  /** Флашкарта в практиката: знаех ли отговора. */
  basic: { knew: boolean }
  /** Изтриване N в cloze: написаното за всяко негово срещане по ред. */
  cloze: { deletion: number; answers: string[] }
  mcq: { choice: number | null }
  short: { text: string }
  /** Целият текст след поправките. */
  edit_text: { text: string }
  /** По един отговор за всеки въпрос или празно място: индекс на вариант, текст или буква. */
  text_set: { answers: (number | string | null)[] }
  mc_cloze: { choices: (number | null)[] }
  open_cloze: { answers: string[] }
  word_formation: { answers: string[] }
  kwt: { text: string }
  listening_set: { answers: (number | string | null)[] }
  /** Самооценка: id на критерий → точки. */
  speaking_task: { scores: Record<string, number> }
  writing_task: { scores: Record<string, number> }
}

export type ResponseFor<T extends ItemType> = Responses[T]

export type PartResult = {
  /** Празно за елемент от една част; иначе g1…, q1…, e1…, c1… */
  key: string
  score: number
  max: number
  /** Всички точки за частта. */
  correct: boolean
  /** Даденият отговор като текст — при текстовите отговори и при редактиране. */
  given?: string
}

export type EvalResult = {
  score: number
  max: number
  /** Всички точки за елемента. */
  correct: boolean
  parts: PartResult[]
  /** Бележки към отговора: над 6 думи, липсва ключовата дума, излишни промени… */
  notes: string[]
  /** Писане и говорене: точките са самооценка и не влизат в тетрадката на грешките. */
  selfAssessed: boolean
}
