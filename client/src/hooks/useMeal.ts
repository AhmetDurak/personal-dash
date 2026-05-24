import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface Food {
  id: number
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

// ─── Shopping list ────────────────────────────────────────────────────────────

export function useShoppingList() {
  const { data, mutate } = useSWR<string[]>('/api/meal/shopping', fetcher)

  async function saveList(items: string[]) {
    await fetch('/api/meal/shopping', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    await mutate()
  }

  return { items: data ?? [], saveList }
}
