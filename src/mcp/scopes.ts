export const SCOPE_GROUPS = {
  'finance:read': {
    label: 'Finance & Investments',
    description: 'Read-only: month summaries, transactions, charts, watchlist prices. No changes can be made to your ledger.',
  },
  'notes:readwrite': {
    label: 'Notes',
    description: 'Read, create, edit, and delete your notes.',
  },
  'mindmap:readwrite': {
    label: 'Mindmap',
    description: 'Read, create, edit, and delete your mindmaps.',
  },
  'language:readwrite': {
    label: 'Language',
    description: 'Read, create, edit, delete, and review your vocabulary, sentences, and scenarios.',
  },
  'chains:readwrite': {
    label: 'Chains',
    description: 'Read, create, check off, and delete your habit chains.',
  },
  'updates:readwrite': {
    label: 'Updates',
    description: 'Publish items (news, improvements, etc.) to your Updates feed, and read/manage what\'s there.',
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
