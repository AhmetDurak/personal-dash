import useSWR from 'swr'
import type { MonthSummary } from '../types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useSummary(month: string) {
  return useSWR<MonthSummary>(`/api/summary/${month}`, fetcher)
}
