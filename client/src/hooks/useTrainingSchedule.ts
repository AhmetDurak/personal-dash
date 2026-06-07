import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface TrainingScheduleEntry {
  id:           number
  user_id:      number
  day_of_week:  number   // 0=Mon..6=Sun
  name:         string
  exercise_id:  number | null
  template_id:  number | null
  duration_min: number | null
  notes:        string | null
  created_at:   string
}

export type CreateSchedulePayload = {
  day_of_week:  number
  name:         string
  exercise_id?: number | null
  template_id?: number | null
  duration_min?: number | null
  notes?:       string | null
}

export function useTrainingSchedule() {
  const { data, mutate, isLoading } = useSWR<TrainingScheduleEntry[]>(
    '/api/sport/schedule', fetcher
  )

  async function addEntry(payload: CreateSchedulePayload) {
    await fetch('/api/sport/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function updateEntry(id: number, payload: Partial<CreateSchedulePayload>) {
    const current = (data ?? []).find(e => e.id === id)
    if (!current) return
    await fetch(`/api/sport/schedule/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...current, ...payload }),
    })
    await mutate()
  }

  async function deleteEntry(id: number) {
    await fetch(`/api/sport/schedule/${id}`, { method: 'DELETE' })
    await mutate()
  }

  const byDay = (data ?? []).reduce<Record<number, TrainingScheduleEntry[]>>((acc, e) => {
    if (!acc[e.day_of_week]) acc[e.day_of_week] = []
    acc[e.day_of_week].push(e)
    return acc
  }, {})

  return { schedule: data ?? [], byDay, isLoading, addEntry, updateEntry, deleteEntry }
}
