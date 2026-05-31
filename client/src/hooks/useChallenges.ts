import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export type ChallengeScope   = 'sport' | 'general'
export type ChallengeStatus  = 'active' | 'completed' | 'abandoned'
export type RepeatCycle      = 'none' | 'weekly' | 'monthly' | 'yearly'

export interface Checkpoint {
  id:           string
  label:        string
  target_date:  string          // ISO date YYYY-MM-DD
  target_value: number | null
  completed:    boolean
  completed_at: string | null
}

export interface Challenge {
  id:           number
  user_id:      number
  scope:        ChallengeScope
  title:        string
  description:  string | null
  target_value: number | null
  target_unit:  string | null
  start_date:   string
  end_date:     string | null
  repeat_cycle: RepeatCycle
  status:       ChallengeStatus
  checkpoints:  Checkpoint[]
  created_at:   string
  updated_at:   string
}

type CreatePayload = {
  scope:        ChallengeScope
  title:        string
  description?: string
  target_value?: number
  target_unit?:  string
  start_date:   string
  end_date?:    string
  repeat_cycle: RepeatCycle
  checkpoints:  Checkpoint[]
}

export function useChallenges(scope: ChallengeScope) {
  const { data, mutate, isLoading } = useSWR<Challenge[]>(
    `/api/sport/challenges?scope=${scope}`,
    fetcher
  )

  async function createChallenge(payload: CreatePayload) {
    await fetch('/api/sport/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function updateChallenge(id: number, partial: Partial<Challenge>) {
    const current = (data ?? []).find(c => c.id === id)
    if (!current) return
    const merged = { ...current, ...partial }
    await fetch(`/api/sport/challenges/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    })
    await mutate()
  }

  async function deleteChallenge(id: number) {
    await fetch(`/api/sport/challenges/${id}`, { method: 'DELETE' })
    await mutate()
  }

  async function toggleCheckpoint(challengeId: number, checkpointId: string) {
    const challenge = (data ?? []).find(c => c.id === challengeId)
    if (!challenge) return
    const checkpoints = challenge.checkpoints.map(cp =>
      cp.id !== checkpointId ? cp : {
        ...cp,
        completed:    !cp.completed,
        completed_at: !cp.completed ? new Date().toISOString() : null,
      }
    )
    await updateChallenge(challengeId, { checkpoints })
  }

  return {
    challenges: data ?? [],
    isLoading,
    createChallenge,
    updateChallenge,
    deleteChallenge,
    toggleCheckpoint,
  }
}

/** Returns all missed checkpoints across all challenges (for notification use) */
export async function fetchMissedCheckpoints(): Promise<{ title: string; checkpoint: Checkpoint }[]> {
  try {
    const res = await fetch('/api/sport/challenges')
    if (!res.ok) return []
    const challenges = await res.json() as Challenge[]
    const today = new Date().toISOString().slice(0, 10)
    const missed: { title: string; checkpoint: Checkpoint }[] = []
    for (const c of challenges) {
      if (c.status !== 'active') continue
      for (const cp of c.checkpoints) {
        if (!cp.completed && cp.target_date < today) {
          missed.push({ title: c.title, checkpoint: cp })
        }
      }
    }
    return missed
  } catch { return [] }
}
