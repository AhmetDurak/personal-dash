import { describe, it, expect } from 'vitest'
import { dueStatus } from '../dueStatus'

const now = new Date(2026, 9, 30, 12) // 30 Oct 2026, local
const item = (due_at: string, interval: number, repetitions = 1, created_at = '2026-09-01T10:00:00.000Z') =>
  ({ due_at, interval, repetitions, created_at })

describe('dueStatus', () => {
  it('is gray for never-reviewed items', () => {
    expect(dueStatus(item('2026-10-20T00:00:00.000Z', 1, 0, '2026-10-20T08:00:00.000Z'), now))
      .toMatchObject({ kind: 'new', label: 'Not reviewed yet' })
  })

  it('is green right after a review and red on the due day', () => {
    expect(dueStatus(item('2026-11-09', 10), now)).toMatchObject({ frac: 0, color: 'hsl(142, 72%, 45%)', label: 'Due in 10d' })
    expect(dueStatus(item('2026-10-30T00:00:00.000Z', 6), now)).toMatchObject({ frac: 1, color: 'hsl(0, 72%, 45%)', label: 'Due today' })
  })

  it('transitions continuously in between', () => {
    const half = dueStatus(item('2026-11-04', 10), now)   // 5 of 10 days used
    expect(half.frac).toBeCloseTo(0.5)
    expect(half.color).toBe('hsl(71, 72%, 45%)')
    expect(dueStatus(item('2026-10-31', 1), now).label).toBe('Due tomorrow')
  })

  it('stays red when overdue, also after a failed review', () => {
    expect(dueStatus(item('2026-10-27', 1, 0), now)).toMatchObject({ kind: 'overdue', frac: 1, label: 'Overdue 3d' })
  })
})
