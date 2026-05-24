import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface JournalEntry {
  id: number
  user_id: number
  date: string
  content: string
  went_well: string[]
  went_bad: string[]
  created_at: string
  updated_at: string
}

export function useJournalEntry(date: string) {
  const { data, mutate, isLoading } = useSWR<JournalEntry | null>(
    `/api/journal?date=${date}`, fetcher
  )

  async function save(content: string, went_well: string[], went_bad: string[]) {
    await fetch(`/api/journal/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, went_well, went_bad }),
    })
    await mutate()
  }

  return { entry: data ?? null, isLoading, save }
}

export function useRecentJournal(limit = 30) {
  return useSWR<JournalEntry[]>(`/api/journal/recent?limit=${limit}`, fetcher)
}
