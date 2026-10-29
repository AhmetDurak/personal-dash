// Builds the single SQL statement for a bulk action on spaced-repetition items
// (vocabulary, sentences, scenarios). Pure so it can be unit-tested; the route
// only validates input and runs the query.

export type BulkTable = 'vocabulary' | 'language_sentences' | 'language_scenarios'

export type BulkAction =
  | { action: 'delete' }
  | { action: 'reset' }                          // forgetting curve restarts, due today
  | { action: 'move'; folder: string | null }

export function parseBulkAction(body: unknown): { ids: number[]; action: BulkAction } | null {
  if (typeof body !== 'object' || body === null) return null
  const { ids, action, folder } = body as { ids?: unknown; action?: unknown; folder?: unknown }
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(i => Number.isInteger(i))) return null
  if (action === 'delete' || action === 'reset') return { ids: ids as number[], action: { action } }
  if (action === 'move' && (folder === null || typeof folder === 'string')) {
    const f = typeof folder === 'string' && folder.trim() ? folder.trim() : null
    return { ids: ids as number[], action: { action, folder: f } }
  }
  return null
}

export function bulkActionQuery(table: BulkTable, uid: number, ids: number[], a: BulkAction): { text: string; values: unknown[] } {
  switch (a.action) {
    case 'delete':
      return { text: `DELETE FROM ${table} WHERE user_id=$1 AND id = ANY($2::int[])`, values: [uid, ids] }
    case 'reset':
      return {
        text: `UPDATE ${table} SET interval=1, repetitions=0, ease_factor=2.5, due_at=CURRENT_DATE WHERE user_id=$1 AND id = ANY($2::int[])`,
        values: [uid, ids],
      }
    case 'move':
      return { text: `UPDATE ${table} SET folder=$3 WHERE user_id=$1 AND id = ANY($2::int[])`, values: [uid, ids, a.folder] }
  }
}
