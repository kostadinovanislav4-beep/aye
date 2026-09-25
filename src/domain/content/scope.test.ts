import { describe, expect, it } from 'vitest'
import type { Catalog, CatalogItem } from './catalog'
import { hasTag, scopeCardIds } from './scope'

const item = (
  id: string,
  type: CatalogItem['type'],
  tags: string[],
  difficulty = 1,
): CatalogItem => ({
  id,
  type,
  tags,
  difficulty,
  verified: true,
  hash: '0',
  ...(type === 'cloze' ? { deletions: [1, 2] } : {}),
})

const catalog: Catalog = {
  decks: [
    {
      id: 'bel-demo',
      title: 'БЕЛ',
      exam: 'bel',
      area: 'demo',
      file: 'content/bel/demo/bel-demo.json',
      items: [
        item('bel-1', 'basic', ['bel.punct.podchineni']),
        item('bel-2', 'cloze', ['bel.gram.chlen'], 2),
        item('bel-3', 'mcq', ['bel.punct']),
      ],
    },
    {
      id: 'cae-demo',
      title: 'CAE',
      exam: 'cae',
      area: 'demo',
      file: 'content/cae/demo/cae-demo.json',
      items: [item('cae-1', 'basic', ['cae.vocab.collocations'], 3)],
    },
  ],
}

describe('обхват на сесията', () => {
  it('таговете са йерархични', () => {
    expect(hasTag({ tags: ['bel.punct.podchineni'] }, ['bel.punct'])).toBe(true)
    expect(hasTag({ tags: ['bel.punctuation'] }, ['bel.punct'])).toBe(false)
  })

  it('филтрира по изпит, колода, таг и трудност и дава само картите', () => {
    expect(scopeCardIds(catalog, {})).toEqual(['bel-1', 'bel-2#c1', 'bel-2#c2', 'cae-1'])
    expect(scopeCardIds(catalog, { exam: 'cae' })).toEqual(['cae-1'])
    expect(scopeCardIds(catalog, { decks: ['bel-demo'], tags: ['bel.punct'] })).toEqual(['bel-1'])
    expect(scopeCardIds(catalog, { difficulty: [2, 3] })).toEqual(['bel-2#c1', 'bel-2#c2', 'cae-1'])
  })
})
