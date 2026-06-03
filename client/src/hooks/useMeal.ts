import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface Food {
  id: number
  user_id: number | null
  name: string
  category: string
  calories_per_100g: number
  emoji: string | null
  created_at: string
}

export interface MealItem {
  food_id: number
  name: string
  emoji: string | null
  amount_g: number
  calories: number
}

export interface MealLog {
  id: number
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  items: MealItem[]
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

// ─── Foods ────────────────────────────────────────────────────────────────────

export function useFoods() {
  const { data, mutate, isLoading } = useSWR<Food[]>('/api/meal/foods', fetcher)

  async function addFood(payload: { name: string; category: string; calories_per_100g: number; emoji?: string }) {
    await fetch('/api/meal/foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function deleteFood(id: number) {
    await fetch(`/api/meal/foods/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { foods: data ?? [], isLoading, addFood, deleteFood }
}

// ─── Meal logs for a date ─────────────────────────────────────────────────────

export function useMealLogs(date: string) {
  const { data, mutate } = useSWR<MealLog[]>(`/api/meal/logs?date=${date}`, fetcher)

  async function saveMeal(meal_type: MealType, items: MealItem[]) {
    await fetch(`/api/meal/logs/${date}/${meal_type}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    await mutate()
  }

  return { logs: data ?? [], saveMeal }
}

// ─── Shopping list (date-keyed) ───────────────────────────────────────────────

export interface ShoppingSession {
  date: string
  items: string[]
}

export function useShoppingList(date: string) {
  const { data, mutate } = useSWR<string[]>(`/api/meal/shopping/${date}`, fetcher)

  async function saveList(items: string[]) {
    await fetch(`/api/meal/shopping/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    await mutate()
  }

  return { items: data ?? [], saveList }
}

export function useShoppingHistory() {
  const { data, mutate } = useSWR<ShoppingSession[]>('/api/meal/shopping/sessions', fetcher)
  return { sessions: data ?? [], refresh: mutate }
}

// ─── Receipt uploads ──────────────────────────────────────────────────────────

export interface Receipt {
  id: number
  date: string
  filename: string
  orig_name: string
  mime_type: string
  size_bytes: number
  created_at: string
}

export function useReceipts(date: string) {
  const { data, mutate } = useSWR<Receipt[]>(`/api/receipts/${date}`, fetcher)

  async function upload(file: File) {
    const form = new FormData()
    form.append('receipt', file)
    await fetch(`/api/receipts/${date}`, { method: 'POST', body: form })
    await mutate()
  }

  async function remove(id: number) {
    await fetch(`/api/receipts/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { receipts: data ?? [], upload, remove }
}
