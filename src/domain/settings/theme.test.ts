import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('връща избраната тема, когато е зададена изрично', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('следва устройството при „system“', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('по подразбиране темата е светла', () => {
    expect(DEFAULT_THEME).toBe('light')
  })
})
