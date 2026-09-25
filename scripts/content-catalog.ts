import path from 'node:path'
import type { Plugin } from 'vite'
import { buildCatalog } from '../src/domain/content/catalog.ts'
import { deckFileSchema, type DeckFile } from '../src/domain/content/schema.ts'
import { CONTENT_DIR, deckPaths, readJson } from './content-files.ts'

/*
 * Vite плъгин: модулът `virtual:aye/catalog` е каталогът на съдържанието (src/domain/content/catalog.ts),
 * сглобен от content/ при build и при всяка промяна в dev. Колода с грешка се пропуска с
 * предупреждение — `npm run validate:content` (и CI) я спира преди публикуване.
 */

export const CATALOG_MODULE = 'virtual:aye/catalog'
const RESOLVED = `\0${CATALOG_MODULE}`

async function readDecks(dir: string, warn: (message: string) => void) {
  const decks: { path: string; data: DeckFile }[] = []
  for (const file of await deckPaths(dir)) {
    try {
      const { path: posix, data } = await readJson(file)
      const parsed = deckFileSchema.safeParse(data)
      if (parsed.success) decks.push({ path: posix, data: parsed.data })
      else warn(`${posix}: колодата не отговаря на схемата и е пропусната.`)
    } catch {
      warn(`${file}: невалиден JSON, колодата е пропусната.`)
    }
  }
  return decks
}

export function contentCatalog(dir: string = CONTENT_DIR): Plugin {
  const root = path.resolve(dir)
  return {
    name: 'aye-content-catalog',
    resolveId(id) {
      return id === CATALOG_MODULE ? RESOLVED : undefined
    },
    async load(id) {
      if (id !== RESOLVED) return undefined
      const decks = await readDecks(dir, (message) => this.warn(message))
      for (const deck of decks) this.addWatchFile(path.resolve(deck.path))
      return `export default ${JSON.stringify(buildCatalog(decks))}`
    },
    configureServer(server) {
      const refresh = (file: string) => {
        if (!file.startsWith(root) || !file.endsWith('.json')) return
        const module = server.moduleGraph.getModuleById(RESOLVED)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.add(root)
      server.watcher.on('add', refresh)
      server.watcher.on('change', refresh)
      server.watcher.on('unlink', refresh)
    },
  }
}
