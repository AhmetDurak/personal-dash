// How far a spaced-repetition item is through its current interval, as a color that
// fades continuously from green (just reviewed) through yellow/orange to red (due).
// The last review date is implied: SM-2 schedules due_at = review day + interval.

export interface SRItem { due_at: string; interval: number; repetitions: number; created_at: string }

export interface DueStatus {
  kind:  'new' | 'scheduled' | 'overdue'
  frac:  number   // 0 = just reviewed … 1 = due
  color: string
  label: string
}

const DAY = 86_400_000
const utcDay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))

function localToday(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const NEW_COLOR = '#94A3B8'

export function dueStatus(item: SRItem, now = new Date()): DueStatus {
  const today = utcDay(localToday(now))
  const due = utcDay(item.due_at)
  const daysLeft = Math.round((due - today) / DAY)

  // Never reviewed: still on its creation-day due date with no successful reviews.
  if (item.repetitions === 0 && item.due_at.slice(0, 10) === item.created_at.slice(0, 10)) {
    return { kind: 'new', frac: 0, color: NEW_COLOR, label: 'Not reviewed yet' }
  }
  if (daysLeft < 0) {
    return { kind: 'overdue', frac: 1, color: hue(1), label: `Overdue ${-daysLeft}d` }
  }
  const interval = Math.max(1, item.interval)
  const frac = Math.min(1, Math.max(0, 1 - daysLeft / interval))
  return {
    kind: 'scheduled',
    frac,
    color: hue(frac),
    label: daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Due tomorrow' : `Due in ${daysLeft}d`,
  }
}

// 0 → green (hue 142), 1 → red (hue 0), smoothly through yellow and orange.
function hue(frac: number): string {
  return `hsl(${Math.round(142 * (1 - frac))}, 72%, 45%)`
}
