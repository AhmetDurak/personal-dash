import useSWR from 'swr'

export interface NotificationSummary {
  month: string
  income: number
  totalExpenses: number
  net: number
  savingsRate: number
}

export interface ETFAlert {
  ticker: string
  name: string
  price: number
  changePct: number
  currency: string
  direction: 'up' | 'down'
}

export interface Reminder {
  id: number
  title: string
  note: string | null
  due_at: string | null
  repeat: string
  done: boolean
  created_at: string
}

export interface NotificationsData {
  summary: NotificationSummary | null
  etfAlerts: ETFAlert[]
  reminders: Reminder[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useNotifications() {
  const { data, mutate, isLoading } = useSWR<NotificationsData>(
    '/api/notifications',
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  )

  async function addReminder(payload: { title: string; note?: string; due_at?: string; repeat?: string }) {
    await fetch('/api/notifications/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function toggleDone(id: number) {
    await fetch(`/api/notifications/reminders/${id}/done`, { method: 'PATCH' })
    await mutate()
  }

  async function deleteReminder(id: number) {
    await fetch(`/api/notifications/reminders/${id}`, { method: 'DELETE' })
    await mutate()
  }

  const badgeCount = (data?.etfAlerts.length ?? 0) + (data?.reminders.length ?? 0)

  return { data, isLoading, badgeCount, addReminder, toggleDone, deleteReminder }
}
