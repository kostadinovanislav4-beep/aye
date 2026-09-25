import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

/*
 * Четене на content/ за валидатора и за каталога при build. Колоди са JSON файловете в
 * content/<изпит>/<област>/…; файловете в content/ и content/<изпит>/ са служебни.
 * Файлът се зарежда и от vite.config.ts, затова импортите по веригата са с разширение.
 */

export type ContentFile = { path: string; data: unknown }

export const CONTENT_DIR = 'content'
const EXAM_DIRS = new Set(['bel', 'cae'])

export const toPosix = (file: string) => file.split(path.sep).join('/')

export async function readJson(file: string): Promise<ContentFile> {
  const raw = await readFile(file, 'utf8')
  return { path: toPosix(file), data: JSON.parse(raw.replace(/^\u{FEFF}/u, '')) as unknown }
}

function isDeckPath(relative: string): boolean {
  const parts = relative.split(/[\\/]/)
  return parts.length >= 3 && EXAM_DIRS.has(parts[0] ?? '') && relative.endsWith('.json')
}

/** Пътищата до всички колоди, подредени по азбучен ред (напр. content/bel/gram/chlen.json). */
export async function deckPaths(dir: string = CONTENT_DIR): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true })
  return entries
    .filter(isDeckPath)
    .map((relative) => path.join(dir, relative))
    .sort()
}
