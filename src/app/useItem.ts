import { useEffect, useState } from 'react'
import { loadItems } from '../data/content'
import type { ContentItem } from '../domain/content/schema'

/** Елементът от съдържанието; undefined, докато колодата му се зарежда, null — ако го няма. */
export function useItem(id: string): ContentItem | null | undefined {
  const [item, setItem] = useState<{ id: string; value: ContentItem | null }>()
  useEffect(() => {
    let active = true
    void loadItems([id]).then((items) => {
      if (active) setItem({ id, value: items.get(id) ?? null })
    })
    return () => {
      active = false
    }
  }, [id])
  return item?.id === id ? item.value : undefined
}
