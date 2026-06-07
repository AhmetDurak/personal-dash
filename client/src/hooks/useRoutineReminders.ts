import { useEffect } from 'react'
import { useDailyPlan } from './useDailyPlan'

// Auto-creates a reminder entry for each routine task that has a time_of_day.
// Uses localStorage to ensure we only create once per routine per day.
// The existing useReminderNotifications hook will fire the browser notification at due time.
export function useRoutineReminders(date: string) {
  const { plan } = useDailyPlan(date)

  useEffect(() => {
    if (!plan) return
    const routines = plan.tasks.filter(
      t => t.tag === 'challenge' && t.timeOfDay && t.challengeId != null
    )
    for (const task of routines) {
      const key = `routine-rem:${task.challengeId}:${date}`
      if (localStorage.getItem(key)) continue
      const due_at = `${date}T${task.timeOfDay}`
      fetch('/api/notifications/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: task.text, due_at }),
      })
        .then(r => { if (r.ok) localStorage.setItem(key, '1') })
        .catch(() => {})
    }
  }, [plan, date])
}
