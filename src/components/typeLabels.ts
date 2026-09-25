import type { ItemType } from '../domain/content/schema'

/** Названията на типовете елементи в интерфейса. */
export const TYPE_LABEL: Record<ItemType, string> = {
  basic: 'Карта',
  cloze: 'Текст със скрити части',
  mcq: 'Избираем отговор',
  short: 'Кратък отговор',
  edit_text: 'Редактиране на текст',
  text_set: 'Текст с въпроси',
  mc_cloze: 'Multiple-choice cloze',
  open_cloze: 'Open cloze',
  word_formation: 'Word formation',
  kwt: 'Key word transformation',
  listening_set: 'Listening',
  speaking_task: 'Speaking',
  writing_task: 'Писане',
}
