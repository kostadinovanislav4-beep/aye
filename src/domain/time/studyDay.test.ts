import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, nextStudyDayStart, studyDay, studyDayStart } from './studyDay'

// Датите са в местно време, за да не зависят тестовете от часовата зона на машината.
const local = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime()

describe('studyDay', () => {
  it('брои времето до 4:00 към предишния ден', () => {
    expect(studyDay(local(2026, 9, 25, 3, 59))).toBe('2026-09-24')
    expect(studyDay(local(2026, 9, 25, 4, 0))).toBe('2026-09-25')
    expect(studyDay(local(2026, 9, 25, 23, 59))).toBe('2026-09-25')
  })

  it('минава правилно през месец и година', () => {
    expect(studyDay(local(2027, 1, 1, 1))).toBe('2026-12-31')
    expect(studyDay(local(2026, 10, 1, 2))).toBe('2026-09-30')
  })
})

describe('addDays и daysBetween', () => {
  it('добавят и броят дни през месеци, години и високосни години', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
    expect(daysBetween('2026-09-25', '2027-05-19')).toBe(236)
    expect(daysBetween('2026-09-25', '2026-09-24')).toBe(-1)
  })

  it('не се влияят от смяната на часовото време', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(daysBetween('2027-03-27', '2027-03-29')).toBe(2)
  })

  it('отказват невалиден ден', () => {
    expect(() => addDays('25.09.2026', 1)).toThrow('Невалиден ден')
  })
})

describe('studyDayStart и nextStudyDayStart', () => {
  it('денят започва в 4:00 местно време', () => {
    expect(studyDayStart('2026-09-25')).toBe(local(2026, 9, 25, 4))
  })

  it('следващият ден започва в 4:00 на другата сутрин', () => {
    expect(nextStudyDayStart(local(2026, 9, 25, 22))).toBe(local(2026, 9, 26, 4))
    expect(nextStudyDayStart(local(2026, 9, 26, 2))).toBe(local(2026, 9, 26, 4))
  })
})
