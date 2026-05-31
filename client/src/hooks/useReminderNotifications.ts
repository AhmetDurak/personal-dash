import { useEffect, useRef } from 'react'
import type { Reminder } from './useNotifications'
import { fetchMissedCheckpoints } from './useChallenges'

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

async function checkChallengeNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const missed = await fetchMissedCheckpoints()
  if (!missed.length) return
  const fired = getFired()
  const today = new Date().toISOString().slice(0, 10)
  for (const { title, checkpoint } of missed) {
    const key = `challenge:${checkpoint.id}:${today}`
    if (fired.has(key)) continue
    new Notification(`Challenge checkpoint overdue: ${title}`, {
      body: `"${checkpoint.label}" was due ${checkpoint.target_date}.`,
      icon: '/favicon.ico',
      tag: `challenge-${checkpoint.id}`,
    })
    addFired(key)
  }
}

async function checkLanguageDueNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const today = new Date().toISOString().slice(0, 10)
  const fired = getFired()
  try {
    const [sentRes, scenRes] = await Promise.all([
      fetch('/api/notebook/language/sentences'),
      fetch('/api/notebook/language/scenarios'),
    ])
    type SR = { id: number; due_at: string }
    const sentences: SR[] = sentRes.ok ? await sentRes.json() : []
    const scenarios: SR[] = scenRes.ok ? await scenRes.json() : []
    const dueSent = sentences.filter(s => s.due_at <= today).length
    const dueScen = scenarios.filter(s => s.due_at <= today).length
    const total   = dueSent + dueScen
    if (total === 0) return
    const key = `language:due:${today}`
    if (fired.has(key)) return
    new Notification('Language Review Due', {
      body: `${total} item${total !== 1 ? 's' : ''} to review (${dueSent} sentence${dueSent !== 1 ? 's' : ''}, ${dueScen} scenario${dueScen !== 1 ? 's' : ''}).`,
      icon: '/favicon.ico',
      tag: 'language-due',
    })
    addFired(key)
  } catch { /* ignore */ }
}

const VOCAB_DAY_KEY = () => `vocab:${new Date().toISOString().slice(0, 10)}`

async function checkVocabNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const key = VOCAB_DAY_KEY()
  if (getFired().has(key)) return
  try {
    const res = await fetch('/api/notebook/vocabulary')
    if (!res.ok) return
    const cards = await res.json() as { due_at: string }[]
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const n = cards.filter(c => new Date(c.due_at) <= today).length
    if (n < 20) return
    new Notification('Vocabulary Review', {
      body: `You have ${n} card${n !== 1 ? 's' : ''} to review today.`,
      icon: '/favicon.ico',
      tag: 'vocab-due',
    })
    addFired(key)
  } catch { /* ignore */ }
}

export function useReminderNotifications() {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  async function check() {
    fireNotifications(await fetchDueReminders())
    await checkVocabNotifications()
    await checkChallengeNotifications()
    await checkLanguageDueNotifications()
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
  const perm = await Notification.requestPermission()
  if (perm === 'granted') fireNotifications(await fetchDueReminders())
  return perm
}
