import { parseBulkAction, bulkActionQuery } from './bulkAction'

describe('parseBulkAction', () => {
  it('accepts delete, reset and move', () => {
    expect(parseBulkAction({ ids: [1, 2], action: 'delete' })).toEqual({ ids: [1, 2], action: { action: 'delete' } })
    expect(parseBulkAction({ ids: [3], action: 'reset' })).toEqual({ ids: [3], action: { action: 'reset', dueAt: null } })
    expect(parseBulkAction({ ids: [3], action: 'reset', dueAt: '2026-11-15' })).toEqual({ ids: [3], action: { action: 'reset', dueAt: '2026-11-15' } })
    expect(parseBulkAction({ ids: [3], action: 'move', folder: ' Verbs ' })).toEqual({ ids: [3], action: { action: 'move', folder: 'Verbs' } })
  })

  it('treats an empty or null folder as "no folder"', () => {
    expect(parseBulkAction({ ids: [1], action: 'move', folder: '' })?.action).toEqual({ action: 'move', folder: null })
    expect(parseBulkAction({ ids: [1], action: 'move', folder: null })?.action).toEqual({ action: 'move', folder: null })
  })

  it('rejects bad input', () => {
    expect(parseBulkAction(null)).toBeNull()
    expect(parseBulkAction({ ids: [], action: 'delete' })).toBeNull()
    expect(parseBulkAction({ ids: ['1'], action: 'delete' })).toBeNull()
    expect(parseBulkAction({ ids: [1], action: 'drop' })).toBeNull()
    expect(parseBulkAction({ ids: [1], action: 'move' })).toBeNull()
    expect(parseBulkAction({ ids: [1], action: 'reset', dueAt: 'tomorrow' })).toBeNull()
    expect(parseBulkAction({ ids: [1], action: 'reset', dueAt: '2026-13-45' })).toBeNull()
  })
})

describe('bulkActionQuery', () => {
  it('scopes every statement to the user and the given ids', () => {
    for (const a of [{ action: 'delete' as const }, { action: 'reset' as const, dueAt: null }, { action: 'move' as const, folder: 'x' }]) {
      const q = bulkActionQuery('vocabulary', 7, [1, 2], a)
      expect(q.text).toContain('user_id=$1 AND id = ANY($2::int[])')
      expect(q.values.slice(0, 2)).toEqual([7, [1, 2]])
    }
  })

  it('reset restores SM-2 defaults and makes items due on the start date (default today)', () => {
    const q = bulkActionQuery('language_sentences', 1, [5], { action: 'reset', dueAt: '2026-11-15' })
    expect(q.text).toContain('interval=1, repetitions=0, ease_factor=2.5, due_at=COALESCE($3::date, CURRENT_DATE)')
    expect(q.values[2]).toBe('2026-11-15')
  })
})
