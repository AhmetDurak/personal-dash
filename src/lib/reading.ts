export const EVALUATION_CRITERIA = [
  'understanding',
  'mainIdea',
  'unnecessaryDetailsRemoved',
  'clarity',
  'explainability',
] as const

export type EvaluationCriterion = typeof EVALUATION_CRITERIA[number]

export interface CriterionScore {
  score: number
  note: string
}

export type EvaluationScores = Record<EvaluationCriterion, CriterionScore>

export function computeTotalScore(scores: EvaluationScores): number {
  return EVALUATION_CRITERIA.reduce((sum, key) => {
    const raw = scores[key]?.score ?? 0
    const clamped = Math.max(0, Math.min(5, Math.round(raw)))
    return sum + clamped
  }, 0)
}

export type ScoreBand = 'needsImprovement' | 'developing' | 'good' | 'veryGood' | 'excellent'

export function scoreBand(total: number): ScoreBand {
  if (total <= 10) return 'needsImprovement'
  if (total <= 15) return 'developing'
  if (total <= 20) return 'good'
  if (total <= 23) return 'veryGood'
  return 'excellent'
}

export interface SummaryFields {
  mainIdea: string
  point1: string
  point2: string
  point3: string
  importance: string
  example: string
}

export function computeWordCount(fields: SummaryFields): { words: number; chars: number } {
  const combined = Object.values(fields).join(' ').trim()
  const words = combined ? combined.split(/\s+/).length : 0
  const chars = Object.values(fields).join('').length
  return { words, chars }
}

export interface ReadingSessionForStats {
  status: string
  totalScore: number | null
  readingTimeSec: number | null
  biggestWeakness: string | null
  completedAt: string | null
}

export interface ReadingStats {
  totalSessions: number
  avgScore: number | null
  latestScore: number | null
  bestScore: number | null
  avgReadingTimeSec: number | null
  scoreTrend: { date: string; score: number }[]
  mostCommonWeakness: string | null
}

export function computeStats(sessions: ReadingSessionForStats[]): ReadingStats {
  const completed = sessions.filter(s => s.status === 'completed' && s.totalScore !== null)

  if (completed.length === 0) {
    return {
      totalSessions: 0,
      avgScore: null,
      latestScore: null,
      bestScore: null,
      avgReadingTimeSec: null,
      scoreTrend: [],
      mostCommonWeakness: null,
    }
  }

  const scores = completed.map(s => s.totalScore as number)
  const readingTimes = completed.map(s => s.readingTimeSec).filter((n): n is number => n !== null)

  const byDateAsc = [...completed].sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))

  const weaknessCounts = new Map<string, number>()
  for (const s of completed) {
    if (!s.biggestWeakness) continue
    weaknessCounts.set(s.biggestWeakness, (weaknessCounts.get(s.biggestWeakness) ?? 0) + 1)
  }
  let mostCommonWeakness: string | null = null
  let maxCount = 0
  for (const [weakness, count] of weaknessCounts) {
    if (count > maxCount) { maxCount = count; mostCommonWeakness = weakness }
  }

  return {
    totalSessions: completed.length,
    avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    latestScore: byDateAsc[byDateAsc.length - 1].totalScore,
    bestScore: Math.max(...scores),
    avgReadingTimeSec: readingTimes.length ? readingTimes.reduce((a, b) => a + b, 0) / readingTimes.length : null,
    scoreTrend: byDateAsc.map(s => ({ date: s.completedAt as string, score: s.totalScore as number })),
    mostCommonWeakness,
  }
}
