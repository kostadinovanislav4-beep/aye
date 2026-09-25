import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EXAMS, ITEM_TYPES, itemSchema } from '../src/domain/content/schema'
import { validateContent, type ContentFile } from '../src/domain/content/validate'

// Примерите в content/README.md са документацията на формата — този тест пази да са верни.
const readme = readFileSync('content/README.md', 'utf8')
const EXAMPLE = /<!-- пример -->\s*```json\r?\n([\s\S]*?)```/g
const examples = Array.from(
  readme.matchAll(EXAMPLE),
  (match) => JSON.parse(match[1] ?? '') as unknown,
)

const readJson = (file: string): ContentFile => ({
  path: file,
  data: JSON.parse(readFileSync(file, 'utf8')) as unknown,
})

describe('примерите в content/README.md', () => {
  it('има пример за всеки тип елемент', () => {
    const types = new Set(examples.map((example) => itemSchema.parse(example).type))
    expect([...types].sort()).toEqual([...ITEM_TYPES].sort())
  })

  it('минават валидатора с истинските tags.json и rubrics.json', () => {
    const items = examples.map((example) => itemSchema.parse(example))
    const decks = EXAMS.map((exam) => ({
      path: `README/${exam}`,
      data: {
        deck: { id: `readme-${exam}`, title: 'Примери', exam, area: 'readme' },
        items: items.filter((item) => item.exam === exam),
      },
    }))
    const report = validateContent({
      decks,
      tags: readJson('content/tags.json'),
      rubrics: readJson('content/rubrics.json'),
    })
    expect(report.issues).toEqual([])
  })
})
