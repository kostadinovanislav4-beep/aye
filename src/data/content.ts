import type { Catalog, CatalogDeck, CatalogItem } from '../domain/content/catalog'
import type { ContentItem, DeckFile } from '../domain/content/schema'

/*
 * Зареждане на съдържанието. Каталогът (малък индекс) е отделна част, а всяка колода —
 * също отделна част, която се зарежда при първа нужда (раздел 3.4 от SPEC). Съдържанието
 * е проверено от `npm run validate:content` преди build, затова тук не се проверява отново.
 */

const deckModules = import.meta.glob<DeckFile>('/content/*/*/*.json', { import: 'default' })

let catalog: Promise<Catalog> | undefined

export function loadCatalog(): Promise<Catalog> {
  catalog ??= import('virtual:aye/catalog').then((module) => module.default)
  return catalog
}

const decks = new Map<string, Promise<DeckFile>>()

export function loadDeck(deck: Pick<CatalogDeck, 'file'>): Promise<DeckFile> {
  const key = `/${deck.file}`
  const cached = decks.get(key)
  if (cached) return cached
  const load = deckModules[key]
  if (!load) return Promise.reject(new Error(`Липсва колодата ${deck.file}.`))
  const promise = load()
  decks.set(key, promise)
  return promise
}

export type CatalogEntry = { deck: CatalogDeck; item: CatalogItem }

/** id на елемента → колодата и записът му в каталога. */
export function indexCatalog(source: Catalog): Map<string, CatalogEntry> {
  const index = new Map<string, CatalogEntry>()
  for (const deck of source.decks) for (const item of deck.items) index.set(item.id, { deck, item })
  return index
}

/** Елементите с тези id, заредени от колодите им. */
export async function loadItems(ids: Iterable<string>): Promise<Map<string, ContentItem>> {
  const wanted = new Set(ids)
  const { decks: all } = await loadCatalog()
  const needed = all.filter((deck) => deck.items.some((item) => wanted.has(item.id)))
  const files = await Promise.all(needed.map(loadDeck))
  const result = new Map<string, ContentItem>()
  for (const file of files) {
    for (const item of file.items) if (wanted.has(item.id)) result.set(item.id, item)
  }
  return result
}
