import path from 'node:path'
import type { Plugin } from 'vite'
import { buildCatalog } from '../src/domain/content/catalog.ts'
import { deckFileSchema, type DeckFile } from '../src/domain/content/schema.ts'
import { CONTENT_DIR, deckPaths, readJson, toPosix } from './content-files.ts'

/*
 * Vite плъгин: модулът `virtual:aye/catalog` е каталогът на съдържанието (src/domain/content/catalog.ts),
 * сглобен от content/ при build и при всяка промяна в dev. Колода с грешка се пропуска с
 * предупреждение — `npm run validate:content` (и CI) я спира преди публикуване.
 * Пътищата се смятат спрямо корена на Vite, а не спрямо папката, от която е пуснат.
 */

export const CATALOG_MODULE = 'virtual:aye/catalog'
const RESOLVED = `\0${CATALOG_MODULE}`

async function readDecks(root: string, dir: string, warn: (message: string) => void) {
  const decks: { path: string; data: DeckFile }[] = []
  for (const file of await deckPaths(path.join(root, dir))) {
    const relative = toPosix(path.relative(root, file))
    try {
      const parsed = deckFileSchema.safeParse((await readJson(file)).data)
      if (parsed.success) decks.push({ path: relative, data: parsed.data })
      else warn(`${relative}: колодата не отговаря на схемата и е пропусната.`)
    } catch {
      warn(`${relative}: невалиден JSON, колодата е пропусната.`)
    }
  }
  return decks
}

export function contentCatalog(dir: string = CONTENT_DIR): Plugin {
  let root = process.cwd()
  return {
    name: 'aye-content-catalog',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      return id === CATALOG_MODULE ? RESOLVED : undefined
    },
    async load(id) {
      if (id !== RESOLVED) return undefined
      const decks = await readDecks(root, dir, (message) => this.warn(message))
      for (const deck of decks) this.addWatchFile(path.join(root, deck.path))
      return `export default ${JSON.stringify(buildCatalog(decks))}`
    },
    configureServer(server) {
      const watched = path.join(root, dir)
      const refresh = (file: string) => {
        if (!file.startsWith(watched) || !file.endsWith('.json')) return
        const module = server.moduleGraph.getModuleById(RESOLVED)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.add(watched)
      server.watcher.on('add', refresh)
      server.watcher.on('change', refresh)
      server.watcher.on('unlink', refresh)
    },
  }
}
