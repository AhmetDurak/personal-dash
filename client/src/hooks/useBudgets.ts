import useSWR from 'swr'

export interface Budget { category: string; amount: number }

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useBudgets() {
  return useSWR<Budget[]>('/api/budgets', fetcher)
}

export async function setBudget(category: string, amount: number) {
  await fetch(`/api/budgets/${encodeURIComponent(category)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })
}

export async function deleteBudget(category: string) {
  await fetch(`/api/budgets/${encodeURIComponent(category)}`, { method: 'DELETE' })
}
