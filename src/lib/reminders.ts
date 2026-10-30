// Validation for editing a reminder (PATCH). Pure so it can be unit-tested; the route
// only turns the result into an UPDATE. Repeat scheduling happens in the client,
// which knows the user's local time zone.

export const REMINDER_REPEATS = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const
export type ReminderRepeat = typeof REMINDER_REPEATS[number]

export interface ReminderPatch {
  title?:  string
  note?:   string | null
  due_at?: string | null
  repeat?: ReminderRepeat
}

export function parseReminderPatch(body: unknown): ReminderPatch | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  const out: ReminderPatch = {}
  if ('title' in b) {
    if (typeof b.title !== 'string' || !b.title.trim()) return null
    out.title = b.title.trim()
  }
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return null
    out.note = typeof b.note === 'string' && b.note.trim() ? b.note.trim() : null
  }
  if ('due_at' in b) {
    if (b.due_at !== null && (typeof b.due_at !== 'string' || isNaN(Date.parse(b.due_at)))) return null
    out.due_at = b.due_at as string | null
  }
  if ('repeat' in b) {
    if (!REMINDER_REPEATS.includes(b.repeat as ReminderRepeat)) return null
    out.repeat = b.repeat as ReminderRepeat
  }
  return Object.keys(out).length ? out : null
}
