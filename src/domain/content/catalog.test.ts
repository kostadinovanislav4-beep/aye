import { describe, expect, it } from 'vitest'
import { buildCatalog, cardIdsOf, catalogItem, itemHash, partsOf } from './catalog'
import { deckFileSchema, itemSchema } from './schema'

const base = {
  exam: 'bel',
  tags: ['bel'],
  difficulty: 1,
  explanation: 'Обяснение.',
  verified: true,
}

const cloze = itemSchema.parse({
  ...base,
  id: 'bel-demo-001',
  type: 'cloze',
  text: '{{c2::Ботев}} е роден в {{c1::Калофер}}; {{c2::Ботев}} е поет.',
})
const basic = itemSchema.parse({
  ...base,
  id: 'bel-demo-002',
  type: 'basic',
  front: 'Л',
  back: 'Г',
})
const edit = itemSchema.parse({
  ...base,
  id: 'bel-demo-003',
  type: 'edit_text',
  prompt: 'Поправете.',
  text: 'Видях приятелят си. Той каза че идва.',
  errors: [
    { fragment: 'приятелят', accepted: ['приятеля'], tag: 'bel.gram.chlen' },
    { fragment: 'каза че', accepted: ['каза, че'], tag: 'bel.punct.podchineni' },
  ],
})

describe('каталог', () => {
  it('дава картите за преговор: basic — една, cloze — по една за всяко изтриване', () => {
    expect(cardIdsOf(catalogItem(basic))).toEqual(['bel-demo-002'])
    expect(cardIdsOf(catalogItem(cloze))).toEqual(['bel-demo-001#c1', 'bel-demo-001#c2'])
    expect(cardIdsOf(catalogItem(edit))).toEqual([])
  })

  it('дава частите и таговете на грешките при редактиране', () => {
    expect(partsOf(edit)).toEqual(['e1', 'e2'])
    expect(catalogItem(edit)).toMatchObject({
      parts: ['e1', 'e2'],
      partTags: { e1: 'bel.gram.chlen', e2: 'bel.punct.podchineni' },
    })
    expect(catalogItem(basic).parts).toBeUndefined()
  })

  it('отпечатъкът е еднакъв за еднакъв елемент и се сменя при промяна', () => {
    expect(itemHash(basic)).toBe(itemHash(itemSchema.parse({ ...basic })))
    expect(itemHash(basic)).not.toBe(itemHash(itemSchema.parse({ ...basic, back: 'Друг' })))
    expect(itemHash(basic)).toMatch(/^[0-9a-f]{14}$/)
  })

  it('сглобява колодите с пътя до файла', () => {
    const data = deckFileSchema.parse({
      deck: { id: 'bel-demo', title: 'Демо', exam: 'bel', area: 'demo' },
      items: [cloze, basic],
    })
    const catalog = buildCatalog([{ path: 'content/bel/demo/bel-demo.json', data }])
    expect(catalog.decks[0]).toMatchObject({
      id: 'bel-demo',
      title: 'Демо',
      file: 'content/bel/demo/bel-demo.json',
    })
    expect(catalog.decks[0]?.items.map((item) => item.id)).toEqual(['bel-demo-001', 'bel-demo-002'])
  })
})
