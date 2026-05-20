import { useEffect, useRef } from 'react'
import type { Reminder } from './useNotifications'

const FIRED_KEY = 'fd:notified'
const INTERVAL_MS = 60_000

function getFired(): Set<string> {
  try {
    const arr = JSON.parse(localStorage.getItem(FIRED_KEY) ?? '[]') as string[]
    return new Set(arr)
  } catch { return new Set() }
}

function addFired(key: string) {
  const arr = [...getFired(), key].slice(-500)
  localStorage.setItem(FIRED_KEY, JSON.stringify(arr))
}

function firingKey(r: Reminder): string {
  return `${r.id}:${new Date().toISOString().slice(0, 10)}`
}

function isDue(r: Reminder): boolean {
  return !!r.due_at && new Date(r.due_at).getTime() <= Date.now()
}

async function fetchDueReminders(): Promise<Reminder[]> {
  try {
    const res = await fetch('/api/notifications')
    if (!res.ok) return []
    const data = await res.json() as { reminders: Reminder[] }
    return (data.reminders ?? []).filter(r => !r.done && isDue(r))
  } catch { return [] }
}

function fireNotifications(reminders: Reminder[]) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const fired = getFired()
  for (const r of reminders) {
    const key = firingKey(r)
    if (fired.has(key)) continue
    new Notification(`Reminder: ${r.title}`, {
      body: r.note ?? '',
      icon: '/favicon.ico',
      tag: `reminder-${r.id}`,
    })
    addFired(key)
  }
}

export function useReminderNotifications() {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  async function check() {
    fireNotifications(await fetchDueReminders())
  }

  useEffect(() => {
    check()
    timer.current = setInterval(check, INTERVAL_MS)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [])
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}
