// Builds the single SQL statement for a bulk action on spaced-repetition items
// (vocabulary, sentences, scenarios). Pure so it can be unit-tested; the route
// only validates input and runs the query.

export type BulkTable = 'vocabulary' | 'language_sentences' | 'language_scenarios'

export type BulkAction =
  | { action: 'delete' }
  | { action: 'reset'; dueAt: string | null }   // forgetting curve restarts, due on dueAt (default today)
  | { action: 'move'; folder: string | null }

export function parseBulkAction(body: unknown): { ids: number[]; action: BulkAction } | null {
  if (typeof body !== 'object' || body === null) return null
  const { ids, action, folder, dueAt } = body as { ids?: unknown; action?: unknown; folder?: unknown; dueAt?: unknown }
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(i => Number.isInteger(i))) return null
  if (action === 'delete') return { ids: ids as number[], action: { action } }
  if (action === 'reset') {
    if (dueAt === undefined || dueAt === null) return { ids: ids as number[], action: { action, dueAt: null } }
    if (typeof dueAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueAt) || isNaN(Date.parse(dueAt))) return null
    return { ids: ids as number[], action: { action, dueAt } }
  }
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
        text: `UPDATE ${table} SET interval=1, repetitions=0, ease_factor=2.5, due_at=COALESCE($3::date, CURRENT_DATE) WHERE user_id=$1 AND id = ANY($2::int[])`,
        values: [uid, ids, a.dueAt],
      }
    case 'move':
      return { text: `UPDATE ${table} SET folder=$3 WHERE user_id=$1 AND id = ANY($2::int[])`, values: [uid, ids, a.folder] }
  }
}
