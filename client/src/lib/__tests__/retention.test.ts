import { describe, it, expect } from 'vitest'
import { retentionSeries } from '../retention'

const today = new Date(2026, 9, 29, 15, 0) // 29 Oct 2026, local time

describe('retentionSeries', () => {
  it('projects the current interval from today when there is no history', () => {
    const s = retentionSeries([], 6, today, 90, 30)
    expect(s).toHaveLength(31)
    expect(s[0]).toEqual({ date: '10-29', pct: 100, today: true })
    expect(s[6].pct).toBe(90) // reaches 90% after `interval` days
  })

  it('resets to 100% at each review and marks its quality', () => {
    const reviews = [
      { quality: 4, interval: 1, reviewed_at: new Date(2026, 9, 20, 9).toISOString() },
      { quality: 2, interval: 1, reviewed_at: new Date(2026, 9, 25, 9).toISOString() },
    ]
    const s = retentionSeries(reviews, 1, today, 90, 3)
    expect(s[0]).toMatchObject({ date: '10-20', pct: 100, review: 4 })
    expect(s[4].pct).toBeLessThan(100)                         // 10-24, decaying
    expect(s[5]).toMatchObject({ date: '10-25', pct: 100, review: 2 })
    expect(s.find(p => p.today)?.date).toBe('10-29')
    expect(s[s.length - 1].date).toBe('11-01')
  })

  it('clips old history to the past window but keeps the decay anchored', () => {
    const reviews = [{ quality: 5, interval: 30, reviewed_at: new Date(2026, 0, 1).toISOString() }]
    const s = retentionSeries(reviews, 30, today, 10, 0)
    expect(s).toHaveLength(11)
    expect(s[0].date).toBe('10-19')
    expect(s.every(p => p.review === undefined)).toBe(true)
    expect(s[0].pct).toBeLessThan(90)
  })
})
