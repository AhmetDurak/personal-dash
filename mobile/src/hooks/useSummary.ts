import useSWR from 'swr'
import { API_BASE } from '../config'
import type { MonthSummary } from '../types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useSummary(month: string) {
  return useSWR<MonthSummary>(`${API_BASE}/api/summary/${month}`, fetcher)
}
