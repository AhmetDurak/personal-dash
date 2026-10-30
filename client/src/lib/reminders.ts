// Reminder scheduling in the user's local time zone (repeat + snooze), and conversion
// between a stored due_at instant and the form's local date / time fields.

export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export const REPEAT_LABELS: Record<ReminderRepeat, string> = {
  none: 'Does not repeat', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
}

const pad = (n: number) => String(n).padStart(2, '0')

// Local wall-clock parts; time is '' for an all-day reminder (local midnight).
export function toLocalParts(dueAt: string | null): { date: string; time: string } {
  if (!dueAt) return { date: '', time: '' }
  const d = new Date(dueAt)
  const time = d.getHours() === 0 && d.getMinutes() === 0 ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time }
}

export function fromLocalParts(date: string, time: string): string | null {
  if (!date) return null
  return new Date(`${date}T${time || '00:00'}:00`).toISOString()
}

// Adds one repeat step in local time; months/years clamp to the last valid day (31 Jan → 28/29 Feb).
function step(d: Date, repeat: Exclude<ReminderRepeat, 'none'>): Date {
  const n = new Date(d)
  if (repeat === 'daily') n.setDate(n.getDate() + 1)
  else if (repeat === 'weekly') n.setDate(n.getDate() + 7)
  else {
    const months = repeat === 'monthly' ? 1 : 12
    const day = d.getDate()
    n.setDate(1)
    n.setMonth(n.getMonth() + months)
    const last = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()
    n.setDate(Math.min(day, last))
  }
  return n
}

// Next due time after completing a repeating reminder: the first occurrence in the future
// (missed occurrences are skipped, not stacked up).
export function nextOccurrence(dueAt: string, repeat: Exclude<ReminderRepeat, 'none'>, now = new Date()): string {
  let d = step(new Date(dueAt), repeat)
  while (d <= now) d = step(d, repeat)
  return d.toISOString()
}

export type SnoozeOption = { label: string; dueAt: string }

export function snoozeOptions(now = new Date()): SnoozeOption[] {
  const at9 = (days: number) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(9, 0, 0, 0); return d.toISOString() }
  return [
    { label: '+1 hour', dueAt: new Date(now.getTime() + 3_600_000).toISOString() },
    { label: 'Tomorrow 9:00', dueAt: at9(1) },
    { label: 'Next week 9:00', dueAt: at9(7) },
  ]
}
