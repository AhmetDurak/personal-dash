export const SCOPE_GROUPS = {
  'finance:read': {
    label: 'Finance & Investments',
    description: 'Read-only: month summaries, transactions, charts, watchlist prices. No changes can be made to your ledger.',
  },
  'notes:readwrite': {
    label: 'Notes',
    description: 'Read, create, edit, and delete your notes.',
  },
} as const

export type ScopeKey = keyof typeof SCOPE_GROUPS

export const ALL_SCOPE_KEYS = Object.keys(SCOPE_GROUPS) as ScopeKey[]

export function parseScope(scope: string): ScopeKey[] {
  return scope.split(' ').filter((s): s is ScopeKey => (ALL_SCOPE_KEYS as string[]).includes(s))
}

export function serializeScope(keys: ScopeKey[]): string {
  return keys.join(' ')
}
