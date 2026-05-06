import useSWR from 'swr'
import { API_BASE } from '../config'
import type { Transaction } from '../types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useTransactions(month: string) {
  return useSWR<Transaction[]>(`${API_BASE}/api/transactions/${month}`, fetcher)
}
