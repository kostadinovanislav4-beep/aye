import { describe, expect, it } from 'vitest'
import { countdownLabel, formatDate, formatTime, plural } from './format'

describe('формати на български', () => {
  it('пише дата и час', () => {
    const at = new Date(2027, 4, 19, 8, 30).getTime()
    expect(formatDate(at)).toBe('19 май 2027 г.')
    expect(formatTime(at)).toBe('08:30 ч.')
  })

  it('пише бройки и обратно броене', () => {
    expect(plural(1, 'карта', 'карти')).toBe('1 карта')
    expect(plural(0, 'карта', 'карти')).toBe('0 карти')
    expect(countdownLabel(236)).toBe('след 236 дни')
    expect(countdownLabel(1)).toBe('утре')
    expect(countdownLabel(0)).toBe('днес')
    expect(countdownLabel(-3)).toBe('мина')
  })
})
