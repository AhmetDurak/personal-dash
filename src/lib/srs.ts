// SM-2 spaced-repetition scheduling for vocabulary, sentences and scenarios.
// Longer items get a shorter second interval and a lower starting ease, so they
// come back sooner while they're new; after that SM-2 adapts each item to its ratings.

export type ReviewKind = 'vocab' | 'sentence' | 'scenario'

export const SRS_CONFIG: Record<ReviewKind, { secondInterval: number; startEase: number }> = {
  vocab:    { secondInterval: 6, startEase: 2.5 },
  sentence: { secondInterval: 4, startEase: 2.3 },
  scenario: { secondInterval: 3, startEase: 2.1 },
}

// quality 0–5: < 3 is a failed recall (back to 1 day), ≥ 3 advances the interval.
export function sm2(kind: ReviewKind, interval: number, repetitions: number, easeFactor: number, quality: number, now = new Date()) {
  let i = interval, r = repetitions, e = easeFactor
  if (quality >= 3) {
    i = r === 0 ? 1 : r === 1 ? SRS_CONFIG[kind].secondInterval : Math.round(i * e)
    r += 1
  } else { i = 1; r = 0 }
  e = Math.max(1.3, e + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  const due = new Date(now)
  due.setDate(due.getDate() + i)
  return { interval: i, repetitions: r, easeFactor: e, dueAt: due.toISOString().slice(0, 10) }
}
