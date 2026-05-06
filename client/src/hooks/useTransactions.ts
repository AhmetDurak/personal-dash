import useSWR from 'swr'
import type { Transaction } from '../types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useTransactions(month: string) {
  return useSWR<Transaction[]>(`/api/transactions/${month}`, fetcher)
}
