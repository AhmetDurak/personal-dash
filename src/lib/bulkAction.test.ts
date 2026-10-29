import { parseBulkAction, bulkActionQuery } from './bulkAction'

describe('parseBulkAction', () => {
  it('accepts delete, reset and move', () => {
    expect(parseBulkAction({ ids: [1, 2], action: 'delete' })).toEqual({ ids: [1, 2], action: { action: 'delete' } })
    expect(parseBulkAction({ ids: [3], action: 'reset' })).toEqual({ ids: [3], action: { action: 'reset' } })
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
  })
})

describe('bulkActionQuery', () => {
  it('scopes every statement to the user and the given ids', () => {
    for (const a of [{ action: 'delete' as const }, { action: 'reset' as const }, { action: 'move' as const, folder: 'x' }]) {
      const q = bulkActionQuery('vocabulary', 7, [1, 2], a)
      expect(q.text).toContain('user_id=$1 AND id = ANY($2::int[])')
      expect(q.values.slice(0, 2)).toEqual([7, [1, 2]])
    }
  })

  it('reset restores SM-2 defaults and makes items due today', () => {
    expect(bulkActionQuery('language_sentences', 1, [5], { action: 'reset' }).text)
      .toContain('interval=1, repetitions=0, ease_factor=2.5, due_at=CURRENT_DATE')
  })
})
