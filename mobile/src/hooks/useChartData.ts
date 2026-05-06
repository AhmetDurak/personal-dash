import useSWR from 'swr'
import { API_BASE } from '../config'
import type { BalanceSeries, DonutDataset, BarDataset } from '../types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useBalanceSeries(months: string[]) {
  const key = months.length ? `${API_BASE}/api/charts/balance?months=${months.join(',')}` : null
  return useSWR<BalanceSeries>(key, fetcher)
}
export function useCategoryDonut(month: string) {
  return useSWR<DonutDataset>(`${API_BASE}/api/charts/donut/${month}`, fetcher)
}
export function useIncomeExpenseBar(months: string[]) {
  const key = months.length ? `${API_BASE}/api/charts/bar?months=${months.join(',')}` : null
  return useSWR<BarDataset>(key, fetcher)
}
