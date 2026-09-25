import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, examTime, mergeSettings, normalizeSettings } from './settings'

describe('normalizeSettings', () => {
  it('допълва старите настройки от Фаза 0 със стойностите по подразбиране', () => {
    expect(normalizeSettings({ theme: 'dark', installHintDismissed: true })).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      installHintDismissed: true,
    })
  })

  it('поправя повредени стойности и маха непознати полета', () => {
    const settings = normalizeSettings({
      theme: 'purple',
      examDates: { bel: '19.05.2027', cae: '2027-06-12T09:00' },
      limits: { newPerDay: 5000, reviewsPerDay: -3 },
      freeMinutes: [30, '60', 45.6],
      askConfidence: 'yes',
      extra: 1,
    })
    expect(settings.theme).toBe('light')
    expect(settings.examDates).toEqual({ bel: '2027-05-19T08:30', cae: '2027-06-12T09:00' })
    expect(settings.limits).toEqual({ newPerDay: 200, reviewsPerDay: 0 })
    expect(settings.freeMinutes).toEqual([30, 60, 46, 60, 60, 120, 120])
    expect(settings.askConfidence).toBe(false)
    expect('extra' in settings).toBe(false)
  })

  it('пази изрично изтрита дата на изпита', () => {
    expect(normalizeSettings({ examDates: { bel: null } }).examDates.bel).toBeNull()
  })

  it('приема нещо, което не е обект', () => {
    expect(normalizeSettings('abc')).toEqual(DEFAULT_SETTINGS)
  })
})

describe('mergeSettings', () => {
  const local = { ...DEFAULT_SETTINGS, theme: 'dark' as const, lastBackupAt: 5, updatedAt: 100 }

  it('по-новите настройки печелят, без тези на устройството', () => {
    const incoming = {
      ...DEFAULT_SETTINGS,
      theme: 'light' as const,
      installHintDismissed: true,
      lastBackupAt: 9,
      updatedAt: 200,
    }
    expect(mergeSettings(local, incoming)).toEqual({
      ...incoming,
      installHintDismissed: false,
      lastBackupAt: 5,
    })
  })

  it('по-старите се пренебрегват', () => {
    expect(mergeSettings(local, { ...DEFAULT_SETTINGS, updatedAt: 50 })).toBe(local)
  })
})

describe('examTime', () => {
  it('чете датата и часа в местно време', () => {
    expect(examTime('2027-05-19T08:30')).toBe(new Date(2027, 4, 19, 8, 30).getTime())
    expect(examTime(null)).toBeNull()
    expect(examTime('2027-05-19')).toBeNull()
  })
})
