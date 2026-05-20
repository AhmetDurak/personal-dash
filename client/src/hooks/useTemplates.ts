import useSWR from 'swr'

export interface RecurringTemplate {
  id: number
  name: string
  amount: number
  type: 'income' | 'expense'
  category: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useTemplates() {
  return useSWR<RecurringTemplate[]>('/api/templates', fetcher)
}

export async function createTemplate(t: Omit<RecurringTemplate, 'id'>) {
  const res = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(t),
  })
  if (!res.ok) throw new Error('Failed to save template')
  return res.json() as Promise<RecurringTemplate>
}

export async function deleteTemplate(id: number) {
  await fetch(`/api/templates/${id}`, { method: 'DELETE' })
}
