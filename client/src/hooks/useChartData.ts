import useSWR from 'swr'
import type { BalanceSeries, DonutDataset, BarDataset, StackedDataset, TopPayee } from '../types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useBalanceSeries(months: string[]) {
  const key = months.length ? `/api/charts/balance?months=${months.join(',')}` : null
  return useSWR<BalanceSeries>(key, fetcher)
}

export function useCategoryDonut(month: string) {
  return useSWR<DonutDataset>(`/api/charts/donut/${month}`, fetcher)
}

export function useIncomeExpenseBar(months: string[]) {
  const key = months.length ? `/api/charts/bar?months=${months.join(',')}` : null
  return useSWR<BarDataset>(key, fetcher)
}

export function useStackedExpenses(months: string[]) {
  const key = months.length ? `/api/charts/stacked-expenses?months=${months.join(',')}` : null
  return useSWR<StackedDataset>(key, fetcher)
}

export function useStackedIncome(months: string[]) {
  const key = months.length ? `/api/charts/stacked-income?months=${months.join(',')}` : null
  return useSWR<StackedDataset>(key, fetcher)
}

export function useTopPayees(month: string, limit = 10) {
  return useSWR<TopPayee[]>(`/api/charts/top-payees?month=${month}&limit=${limit}`, fetcher)
}
