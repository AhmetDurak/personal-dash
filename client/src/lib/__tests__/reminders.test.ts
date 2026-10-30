import { describe, it, expect } from 'vitest'
import { toLocalParts, fromLocalParts, nextOccurrence, snoozeOptions } from '../reminders'

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).toISOString()

describe('reminder date helpers', () => {
  it('round-trips local date/time through the stored instant', () => {
    const iso = fromLocalParts('2026-11-02', '09:30')!
    expect(toLocalParts(iso)).toEqual({ date: '2026-11-02', time: '09:30' })
    expect(toLocalParts(fromLocalParts('2026-11-02', ''))).toEqual({ date: '2026-11-02', time: '' })
    expect(fromLocalParts('', '09:00')).toBeNull()
  })

  it('moves a repeating reminder to its next future occurrence', () => {
    const now = new Date(2026, 9, 30, 12)
    expect(nextOccurrence(local(2026, 10, 30, 9), 'daily', now)).toBe(local(2026, 10, 31, 9))
    expect(nextOccurrence(local(2026, 10, 26, 9), 'weekly', now)).toBe(local(2026, 11, 2, 9))   // across DST end, still 9:00
    expect(nextOccurrence(local(2026, 10, 1, 9), 'daily', now)).toBe(local(2026, 10, 31, 9))    // missed days skipped
  })

  it('clamps monthly and yearly repeats to the last day of the month', () => {
    const now = new Date(2026, 0, 31, 12)
    expect(nextOccurrence(local(2026, 1, 31, 8), 'monthly', now)).toBe(local(2026, 2, 28, 8))
    expect(nextOccurrence(local(2024, 2, 29, 8), 'yearly', new Date(2024, 2, 1))).toBe(local(2025, 2, 28, 8))
  })

  it('offers snooze times relative to now', () => {
    const now = new Date(2026, 9, 30, 22, 15)
    const [hour, tomorrow, week] = snoozeOptions(now)
    expect(hour.dueAt).toBe(local(2026, 10, 30, 23, 15))
    expect(tomorrow.dueAt).toBe(local(2026, 10, 31, 9))
    expect(week.dueAt).toBe(local(2026, 11, 6, 9))
  })
})
