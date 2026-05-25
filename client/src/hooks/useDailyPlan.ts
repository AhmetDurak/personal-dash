import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface PlanTask {
  id: string
  text: string
  done: boolean
}

export interface DailyPlan {
  id: number
  user_id: number
  date: string
  tasks: PlanTask[]
  notes: string
  created_at: string
  updated_at: string
}

export function useDailyPlan(date: string) {
  const { data, mutate, isLoading } = useSWR<DailyPlan | null>(
    `/api/plan/${date}`, fetcher
  )

  async function save(tasks: PlanTask[], notes: string) {
    await fetch(`/api/plan/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, notes }),
    })
    await mutate()
  }

  return { plan: data ?? null, isLoading, save }
}
