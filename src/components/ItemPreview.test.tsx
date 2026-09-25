import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import readme from '../../content/README.md?raw'
import { ITEM_TYPES, itemSchema } from '../domain/content/schema'
import { ItemPreview } from './ItemPreview'

// Примерите от content/README.md покриват всички 13 типа.
const EXAMPLE = /<!-- пример -->\s*```json\r?\n([\s\S]*?)```/g
const items = Array.from(readme.matchAll(EXAMPLE), (match) =>
  itemSchema.parse(JSON.parse(match[1] ?? '')),
)

describe('ItemPreview', () => {
  it('показва всеки тип елемент с id и обяснението', () => {
    expect(new Set(items.map((item) => item.type)).size).toBe(ITEM_TYPES.length)
    for (const item of items) {
      const html = renderToStaticMarkup(<ItemPreview item={item} />)
      expect(html).toContain(item.id)
      expect(html).toContain('Обяснение')
    }
  })

  it('отбелязва верния вариант', () => {
    const mcq = items.find((item) => item.type === 'mcq')
    if (!mcq) throw new Error('Липсва пример за mcq.')
    expect(renderToStaticMarkup(<ItemPreview item={mcq} />)).toContain('(верен)')
  })
})
