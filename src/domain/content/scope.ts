import type { SessionScope } from '../progress/types'
import { cardIdsOf, type Catalog, type CatalogItem } from './catalog'

/** Таговете са йерархични: „bel.punct“ хваща и „bel.punct.podchineni“. */
export function hasTag(item: Pick<CatalogItem, 'tags'>, wanted: readonly string[]): boolean {
  return item.tags.some((tag) => wanted.some((w) => tag === w || tag.startsWith(`${w}.`)))
}

/** Елементите от каталога, които влизат в обхвата на сесията (празно поле — без ограничение). */
export function scopeItems(catalog: Catalog, scope: SessionScope): CatalogItem[] {
  return catalog.decks
    .filter((deck) => !scope.exam || deck.exam === scope.exam)
    .filter((deck) => !scope.decks?.length || scope.decks.includes(deck.id))
    .flatMap((deck) => deck.items)
    .filter((item) => !scope.tags?.length || hasTag(item, scope.tags))
    .filter((item) => !scope.difficulty?.length || scope.difficulty.includes(item.difficulty))
}

/** Картите за преговор в обхвата, по реда в съдържанието. */
export function scopeCardIds(catalog: Catalog, scope: SessionScope): string[] {
  return scopeItems(catalog, scope).flatMap(cardIdsOf)
}
