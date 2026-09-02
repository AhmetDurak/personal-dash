import type { ReadingSession } from '../../../../hooks/useReading'

export const SECRET_SOURCE_TEXT = 'THE_ORIGINAL_SOURCE_CONTENT_MUST_NEVER_LEAK'

export function makeSession(overrides: Partial<ReadingSession> = {}): ReadingSession {
  return {
    id: 1,
    status: 'reading',
    title: 'Test Session',
    category: 'Testing',
    sourceContent: SECRET_SOURCE_TEXT,
    readingStartedAt: new Date().toISOString(),
    readingTimeSec: null,
    summaryMainIdea: '',
    summaryPoint1: '',
    summaryPoint2: '',
    summaryPoint3: '',
    summaryImportance: '',
    summaryExample: '',
    summaryWordCount: null,
    evaluationScores: null,
    totalScore: null,
    biggestWeakness: null,
    weaknessNote: null,
    improvedSummary: null,
    reflectionLearned: null,
    canExplain2min: null,
    takeaway: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  }
}
