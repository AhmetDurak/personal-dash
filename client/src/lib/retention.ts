// Day-by-day estimated retention of a vocabulary word, reconstructed from its review
// history: each review resets retention to 100% and sets the interval of the next
// decay (exp curve that reaches 90% after `interval` days).

export interface ReviewEntry { quality: number; interval: number; reviewed_at: string }

export interface RetentionPoint {
  date:    string        // 'MM-DD' axis label
  pct:     number        // estimated retention 0–100
  review?: number        // quality of the review on this day, if any
  today?:  boolean
}

const LN09K = -1 / Math.log(0.9)
const DAY = 86_400_000

function dayStart(d: Date): number {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime()
}

// Calendar-day stepping — adding 24h drifts across daylight-saving changes.
function addDays(t: number, n: number): number {
  const d = new Date(t); d.setDate(d.getDate() + n); return dayStart(d)
}

const daysBetween = (a: number, b: number) => Math.round((b - a) / DAY)

function label(t: number): string {
  const d = new Date(t)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const retention = (daysSince: number, interval: number) =>
  Math.max(0, Math.round(Math.exp(-daysSince / (Math.max(1, interval) * LN09K)) * 100))

export function retentionSeries(
  reviews: ReviewEntry[], currentInterval: number, today: Date, pastDays = 90, futureDays = 30,
): RetentionPoint[] {
  const t0 = dayStart(today)
  const logged = reviews
    .map(r => ({ day: dayStart(new Date(r.reviewed_at)), quality: r.quality, interval: r.interval }))
    .sort((a, b) => a.day - b.day)

  // No history yet: project the current interval forward from today.
  if (logged.length === 0) {
    return Array.from({ length: futureDays + 1 }, (_, i) => ({
      date: label(addDays(t0, i)), pct: retention(i, currentInterval), ...(i === 0 ? { today: true } : {}),
    }))
  }

  const start = Math.max(logged[0].day, addDays(t0, -pastDays))
  const end = addDays(t0, futureDays)
  const points: RetentionPoint[] = []
  for (let t = start; t <= end; t = addDays(t, 1)) {
    const sameDay = logged.filter(r => r.day === t)
    const anchor = [...logged].reverse().find(r => r.day <= t)!
    points.push({
      date: label(t),
      pct: retention(daysBetween(anchor.day, t), anchor.interval),
      ...(sameDay.length ? { review: sameDay[sameDay.length - 1].quality } : {}),
      ...(t === t0 ? { today: true } : {}),
    })
  }
  return points
}
