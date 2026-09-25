import { useEffect, useState } from 'react'
import { loadCatalog } from '../data/content'
import type { Catalog } from '../domain/content/catalog'

let cached: Catalog | undefined

/** Каталогът на съдържанието; undefined, докато се зарежда. */
export function useCatalog(): Catalog | undefined {
  const [catalog, setCatalog] = useState(cached)
  useEffect(() => {
    if (cached) return
    let active = true
    void loadCatalog().then((loaded) => {
      cached = loaded
      if (active) setCatalog(loaded)
    })
    return () => {
      active = false
    }
  }, [])
  return catalog
}
