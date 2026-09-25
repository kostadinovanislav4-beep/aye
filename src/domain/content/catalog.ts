import { clozeCardId } from '../progress/ids.ts'
import { parseCloze } from './markers.ts'
import type { ContentItem, DeckFile, Exam, ItemType } from './schema.ts'

/*
 * Каталогът е малък индекс на цялото съдържание: колодите и за всеки елемент — тип, тагове,
 * трудност, проверен ли е, картите и частите му. Сглобява се при build (scripts/content-catalog.ts)
 * и стига, за да се изчислят преговорите за деня, без да се зарежда всяка колода.
 * Файлът се зарежда и от vite.config.ts, затова импортите му са с разширение.
 */

export type CatalogItem = {
  id: string
  type: ItemType
  tags: string[]
  difficulty: number
  verified: boolean
  /** Отпечатък на елемента — ако се промени, проверката от „За проверка“ вече не важи. */
  hash: string
  /** Номерата на изтриванията в cloze (всяко е отделна карта). */
  deletions?: number[]
  /** Частите за тетрадката (g1…, q1…, e1…); липсва за елемент от една част. */
  parts?: string[]
  /** Таг на част, различен от таговете на елемента (грешките при редактиране). */
  partTags?: Record<string, string>
}

export type CatalogDeck = {
  id: string
  title: string
  exam: Exam
  area: string
  description?: string
  /** Пътят до файла, напр. content/bel/gram/chlen.json. */
  file: string
  items: CatalogItem[]
}

export type Catalog = { decks: CatalogDeck[] }

/** Типовете, които са карти за преговор (флашкарти). */
export const CARD_TYPES: readonly ItemType[] = ['basic', 'cloze']

/**
 * Хеш cyrb53 (53 бита) като 14 шестнадесетични знака. Не е за сигурност — само за откриване
 * на промяна в елемента.
 */
export function contentHash(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
}

export function itemHash(item: ContentItem): string {
  return contentHash(JSON.stringify(item))
}

/** Частите на елемента, по които се оценява и се пази тетрадката. */
export function partsOf(item: ContentItem): string[] {
  const numbered = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`)
  switch (item.type) {
    case 'cloze':
      return clozeDeletions(item.text).map((n) => `c${n}`)
    case 'edit_text':
      return numbered('e', item.errors.length)
    case 'text_set':
      return item.format === 'gapped'
        ? numbered('g', item.gaps.length)
        : numbered('q', item.questions.length)
    case 'mc_cloze':
    case 'open_cloze':
    case 'word_formation':
      return numbered('g', item.gaps.length)
    case 'listening_set':
      return numbered('q', item.questions.length)
    case 'basic':
    case 'mcq':
    case 'short':
    case 'kwt':
    case 'speaking_task':
    case 'writing_task':
      return []
  }
}

/** Различните номера на изтриванията в cloze, по ред. */
export function clozeDeletions(text: string): number[] {
  return [...new Set(parseCloze(text).map((deletion) => deletion.index))].sort((a, b) => a - b)
}

export function catalogItem(item: ContentItem): CatalogItem {
  const parts = partsOf(item)
  const entry: CatalogItem = {
    id: item.id,
    type: item.type,
    tags: item.tags,
    difficulty: item.difficulty,
    verified: item.verified,
    hash: itemHash(item),
  }
  if (item.type === 'cloze') entry.deletions = clozeDeletions(item.text)
  if (parts.length > 0) entry.parts = parts
  if (item.type === 'edit_text') {
    entry.partTags = Object.fromEntries(item.errors.map((error, i) => [`e${i + 1}`, error.tag]))
  }
  return entry
}

/** Картите за преговор на елемента: basic — самият той, cloze — всяко изтриване. */
export function cardIdsOf(item: Pick<CatalogItem, 'id' | 'type' | 'deletions'>): string[] {
  if (item.type === 'basic') return [item.id]
  if (item.type === 'cloze') return (item.deletions ?? []).map((n) => clozeCardId(item.id, n))
  return []
}

export function buildCatalog(files: readonly { path: string; data: DeckFile }[]): Catalog {
  return {
    decks: files.map(({ path, data }) => ({
      id: data.deck.id,
      title: data.deck.title,
      exam: data.deck.exam,
      area: data.deck.area,
      ...(data.deck.description === undefined ? {} : { description: data.deck.description }),
      file: path,
      items: data.items.map(catalogItem),
    })),
  }
}
