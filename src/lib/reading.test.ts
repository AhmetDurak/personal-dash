import { computeTotalScore, scoreBand, computeWordCount, computeStats, type EvaluationScores } from './reading'

function scores(overrides: Partial<Record<keyof EvaluationScores, number>>): EvaluationScores {
  const base = { understanding: 0, mainIdea: 0, unnecessaryDetailsRemoved: 0, clarity: 0, explainability: 0, ...overrides }
  return {
    understanding: { score: base.understanding, note: '' },
    mainIdea: { score: base.mainIdea, note: '' },
    unnecessaryDetailsRemoved: { score: base.unnecessaryDetailsRemoved, note: '' },
    clarity: { score: base.clarity, note: '' },
    explainability: { score: base.explainability, note: '' },
  }
}

describe('computeTotalScore', () => {
  it('sums all 5 criteria', () => {
    expect(computeTotalScore(scores({ understanding: 5, mainIdea: 4, unnecessaryDetailsRemoved: 3, clarity: 2, explainability: 1 }))).toBe(15)
  })

  it('clamps out-of-range values into 0-5', () => {
    // understanding 9 -> clamped to 5, mainIdea -3 -> clamped to 0, rest 0
    expect(computeTotalScore(scores({ understanding: 9, mainIdea: -3 }))).toBe(5)
  })

  it('returns 0 for all-zero scores', () => {
    expect(computeTotalScore(scores({}))).toBe(0)
  })

  it('returns 25 for all-max scores', () => {
    expect(computeTotalScore(scores({ understanding: 5, mainIdea: 5, unnecessaryDetailsRemoved: 5, clarity: 5, explainability: 5 }))).toBe(25)
  })
})

describe('scoreBand', () => {
  it.each([
    [0, 'needsImprovement'], [10, 'needsImprovement'],
    [11, 'developing'], [15, 'developing'],
    [16, 'good'], [20, 'good'],
    [21, 'veryGood'], [23, 'veryGood'],
    [24, 'excellent'], [25, 'excellent'],
  ] as const)('scoreBand(%i) === %s', (total, band) => {
    expect(scoreBand(total)).toBe(band)
  })
})

describe('computeWordCount', () => {
  it('counts words across all summary fields', () => {
    const { words } = computeWordCount({
      mainIdea: 'the main idea',
      point1: 'point one here',
      point2: '', point3: '', importance: '', example: '',
    })
    expect(words).toBe(6)
  })

  it('returns 0 words for all-empty fields', () => {
    const { words, chars } = computeWordCount({ mainIdea: '', point1: '', point2: '', point3: '', importance: '', example: '' })
    expect(words).toBe(0)
    expect(chars).toBe(0)
  })

  it('counts characters across all fields', () => {
    const { chars } = computeWordCount({ mainIdea: 'abc', point1: 'de', point2: '', point3: '', importance: '', example: '' })
    expect(chars).toBe(5)
  })
})

describe('computeStats', () => {
  it('returns empty/null stats for no completed sessions', () => {
    const stats = computeStats([{ status: 'reading', totalScore: null, readingTimeSec: null, biggestWeakness: null, completedAt: null }])
    expect(stats.totalSessions).toBe(0)
    expect(stats.avgScore).toBeNull()
    expect(stats.scoreTrend).toEqual([])
  })

  it('computes avg/best/latest correctly', () => {
    const stats = computeStats([
      { status: 'completed', totalScore: 10, readingTimeSec: 60, biggestWeakness: 'too_vague', completedAt: '2026-01-01T00:00:00Z' },
      { status: 'completed', totalScore: 20, readingTimeSec: 120, biggestWeakness: 'too_vague', completedAt: '2026-01-02T00:00:00Z' },
      { status: 'reading', totalScore: null, readingTimeSec: null, biggestWeakness: null, completedAt: null },
    ])
    expect(stats.totalSessions).toBe(2)
    expect(stats.avgScore).toBe(15)
    expect(stats.bestScore).toBe(20)
    expect(stats.latestScore).toBe(20)
    expect(stats.avgReadingTimeSec).toBe(90)
    expect(stats.mostCommonWeakness).toBe('too_vague')
    expect(stats.scoreTrend).toEqual([
      { date: '2026-01-01T00:00:00Z', score: 10 },
      { date: '2026-01-02T00:00:00Z', score: 20 },
    ])
  })

  it('picks the most common weakness by count', () => {
    const stats = computeStats([
      { status: 'completed', totalScore: 10, readingTimeSec: 60, biggestWeakness: 'too_vague', completedAt: '2026-01-01T00:00:00Z' },
      { status: 'completed', totalScore: 10, readingTimeSec: 60, biggestWeakness: 'poor_structure', completedAt: '2026-01-02T00:00:00Z' },
      { status: 'completed', totalScore: 10, readingTimeSec: 60, biggestWeakness: 'poor_structure', completedAt: '2026-01-03T00:00:00Z' },
    ])
    expect(stats.mostCommonWeakness).toBe('poor_structure')
  })
})
