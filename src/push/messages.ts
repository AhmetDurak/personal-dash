// Pure helpers that decide which push notifications are due. No I/O — the
// notifier gathers a DueSnapshot from the DB and sends whatever this returns.
// Texts mirror the in-browser notifications in client/src/hooks/useReminderNotifications.ts.

// Daily digests (language, vocab, challenges) wait until this local hour so the
// phone isn't woken at midnight. Reminders fire at their own due time.
export const DIGEST_HOUR = 8
export const VOCAB_THRESHOLD = 20

export interface DueSnapshot {
  reminders:         { id: number; title: string; note: string | null; due_at: string }[]
  vocabDue:          number
  sentencesDue:      number
  scenariosDue:      number
  missedCheckpoints: { id: string; challenge: string; scope: string; label: string; target_date: string }[]
}

export interface PushMessage {
  key:   string  // dedupe key — each key is pushed at most once per user
  title: string
  body:  string
  url:   string  // opened when the notification is tapped
}

function plural(n: number, word: string) {
  return `${n} ${word}${n !== 1 ? 's' : ''}`
}

export function buildMessages(d: DueSnapshot, localDate: string, localHour: number): PushMessage[] {
  const out: PushMessage[] = d.reminders.map(r => ({
    key: `reminder:${r.id}:${r.due_at}`,   // once per due time — snoozing or repeating notifies again
    title: `Reminder: ${r.title}`,
    body: r.note ?? '',
    url: '/reminders',
  }))

  if (localHour < DIGEST_HOUR) return out

  for (const cp of d.missedCheckpoints) {
    out.push({
      key: `challenge:${cp.id}:${localDate}`,
      title: `Challenge checkpoint overdue: ${cp.challenge}`,
      body: `"${cp.label}" was due ${cp.target_date}.`,
      url: cp.scope === 'sport' ? '/life/sport?view=challenges' : '/planner',
    })
  }

  const langTotal = d.sentencesDue + d.scenariosDue
  if (langTotal > 0) {
    out.push({
      key: `language:due:${localDate}`,
      title: 'Language Review Due',
      body: `${plural(langTotal, 'item')} to review (${plural(d.sentencesDue, 'sentence')}, ${plural(d.scenariosDue, 'scenario')}).`,
      url: d.scenariosDue > 0 ? '/learn/language/scenario' : '/learn/language/sentence',
    })
  }

  if (d.vocabDue >= VOCAB_THRESHOLD) {
    out.push({
      key: `vocab:${localDate}`,
      title: 'Vocabulary Review',
      body: `You have ${plural(d.vocabDue, 'card')} to review today.`,
      url: '/learn/language/vocab',
    })
  }

  return out
}

// Local calendar date (YYYY-MM-DD) and hour (0-23) in an IANA timezone.
export function localClock(tz: string, now: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) }
}

export function isValidTimeZone(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false }
}
