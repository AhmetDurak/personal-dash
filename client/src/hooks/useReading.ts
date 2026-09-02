import { useRef } from 'react'
import useSWR from 'swr'

export type ReadingStatus = 'reading' | 'recall' | 'evaluate' | 'improve' | 'reflect' | 'completed'

export interface CriterionScore { score: number; note: string }
export interface EvaluationScores {
  understanding: CriterionScore
  mainIdea: CriterionScore
  unnecessaryDetailsRemoved: CriterionScore
  clarity: CriterionScore
  explainability: CriterionScore
}

export interface ReadingSession {
  id: number
  status: ReadingStatus
  title: string
  category: string | null
  sourceContent: string
  readingStartedAt: string
  readingTimeSec: number | null
  summaryMainIdea: string
  summaryPoint1: string
  summaryPoint2: string
  summaryPoint3: string
  summaryImportance: string
  summaryExample: string
  summaryWordCount: number | null
  evaluationScores: EvaluationScores | null
  totalScore: number | null
  biggestWeakness: string | null
  weaknessNote: string | null
  improvedSummary: string | null
  reflectionLearned: string | null
  canExplain2min: boolean | null
  takeaway: string | null
  createdAt: string
  updatedAt: string
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

const fetcher = (url: string) => fetch(url).then(r => r.json())
const DEBOUNCE_MS = 1000

async function postJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

export function useReadingSessions() {
  const { data, mutate, isLoading } = useSWR<ReadingSession[]>('/api/reading', fetcher)

  async function createSession(title: string, sourceContent: string, category: string | null) {
    const session = await postJson('/api/reading', 'POST', { title, sourceContent, category }) as ReadingSession
    await mutate()
    return session
  }

  async function removeSession(id: number) {
    await postJson(`/api/reading/${id}`, 'DELETE')
    await mutate()
  }

  return { sessions: data ?? [], isLoading, createSession, removeSession }
}

export function useReadingSession(id: number | null) {
  const { data, mutate } = useSWR<ReadingSession[]>('/api/reading', fetcher)
  const session = id !== null ? (data ?? []).find(s => s.id === id) ?? null : null
  const summaryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const improvedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function goToRecall() {
    if (!id) return
    await postJson(`/api/reading/${id}/recall`, 'PATCH')
    await mutate()
  }

  function saveSummaryDraft(patch: Partial<{
    mainIdea: string; point1: string; point2: string; point3: string; importance: string; example: string
  }>) {
    if (!id) return
    if (summaryTimer.current) clearTimeout(summaryTimer.current)
    summaryTimer.current = setTimeout(async () => {
      await postJson(`/api/reading/${id}/summary`, 'PATCH', patch)
      await mutate()
    }, DEBOUNCE_MS)
  }

  async function advanceStage(status: ReadingStatus) {
    if (!id) return
    await postJson(`/api/reading/${id}/advance`, 'PATCH', { status })
    await mutate()
  }

  async function submitEvaluation(scores: EvaluationScores, biggestWeakness: string | null, weaknessNote: string | null) {
    if (!id) return
    await postJson(`/api/reading/${id}/evaluation`, 'PUT', { scores, biggestWeakness, weaknessNote })
    await mutate()
  }

  function saveImprovedDraft(improvedSummary: string) {
    if (!id) return
    if (improvedTimer.current) clearTimeout(improvedTimer.current)
    improvedTimer.current = setTimeout(async () => {
      await postJson(`/api/reading/${id}/improved-summary`, 'PATCH', { improvedSummary })
      await mutate()
    }, DEBOUNCE_MS)
  }

  async function submitReflection(reflectionLearned: string, canExplain2min: boolean, takeaway: string) {
    if (!id) return
    await postJson(`/api/reading/${id}/reflection`, 'PUT', { reflectionLearned, canExplain2min, takeaway })
    await mutate()
  }

  return {
    session, goToRecall, saveSummaryDraft, advanceStage,
    submitEvaluation, saveImprovedDraft, submitReflection,
  }
}

export function useReadingStats() {
  const { data, isLoading } = useSWR<ReadingStats>('/api/reading/stats', fetcher)
  return { stats: data ?? null, isLoading }
}
