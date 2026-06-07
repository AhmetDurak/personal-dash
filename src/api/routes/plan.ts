import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export interface PlanTask {
  id: string
  text: string
  done: boolean
  tag?: 'sport' | 'challenge'
  trainingScheduleId?: number
  templateId?: number | null
  setsCount?: number | null
  reps?: number | null
  weightKg?: number | null
  durationMin?: number | null
  challengeId?: number
  timeOfDay?: string | null
}

// 0=Mon..6=Sun from a YYYY-MM-DD string
function dayOfWeek(date: string): number {
  const d = new Date(date + 'T12:00:00')
  return (d.getDay() + 6) % 7
}

export function planRouter(pool: Pool): Router {
  const router = Router()

  router.get('/:date', async (req: Request, res: Response) => {
    const uid  = (req.user as Express.User).id
    const { date } = req.params

    const dow = dayOfWeek(date)  // 0=Mon..6=Sun
    const [planResult, scheduleResult, routineResult] = await Promise.all([
      pool.query('SELECT * FROM daily_plans WHERE user_id=$1 AND date=$2', [uid, date]),
      pool.query(
        'SELECT * FROM training_schedules WHERE user_id=$1 AND day_of_week=$2 ORDER BY id',
        [uid, dow]
      ),
      // Active routines: daily always, weekly if dow matches start_date dow
      pool.query(
        `SELECT * FROM challenges
         WHERE user_id=$1 AND status='active'
           AND repeat_cycle IN ('daily','weekly')
           AND start_date <= $2
           AND (end_date IS NULL OR end_date >= $2)`,
        [uid, date]
      ),
    ])

    const plan  = planResult.rows[0] ?? null
    const tasks: PlanTask[] = plan ? plan.tasks : []

    // Inject training tasks not already saved
    const savedTrainingIds = new Set(
      tasks.filter(t => t.trainingScheduleId != null).map(t => t.trainingScheduleId)
    )
    const trainingExtra: PlanTask[] = scheduleResult.rows
      .filter(s => !savedTrainingIds.has(s.id))
      .map(s => ({
        id:                 `ts-${s.id}-${date}`,
        text:               s.name,
        done:               false,
        tag:                'sport' as const,
        trainingScheduleId: s.id,
        templateId:         s.template_id ?? null,
        setsCount:          s.sets_count ?? null,
        reps:               s.reps ?? null,
        weightKg:           s.weight_kg != null ? Number(s.weight_kg) : null,
        durationMin:        s.duration_min ?? null,
      }))

    // Inject routines: daily always; weekly/monthly if repeat_days matches
    const savedChallengeIds = new Set(
      tasks.filter(t => t.challengeId != null).map(t => t.challengeId)
    )
    const dayOfMonth = new Date(date + 'T12:00:00').getDate()
    const routineExtra: PlanTask[] = routineResult.rows
      .filter(r => {
        if (savedChallengeIds.has(r.id)) return false
        if (r.repeat_cycle === 'daily') return true
        if (r.repeat_cycle === 'weekly') {
          const days: number[] = r.repeat_days ? JSON.parse(r.repeat_days) : []
          return days.length > 0 && days.includes(dow)
        }
        if (r.repeat_cycle === 'monthly') {
          const days: number[] = r.repeat_days ? JSON.parse(r.repeat_days) : []
          return days.length > 0 && days.includes(dayOfMonth)
        }
        return false
      })
      .map(r => ({
        id:          `routine-${r.id}-${date}`,
        text:        r.title,
        done:        false,
        tag:         'challenge' as const,
        challengeId: r.id,
        timeOfDay:   r.time_of_day ?? null,
      }))

    const merged = [...tasks, ...trainingExtra, ...routineExtra]

    if (plan) {
      res.json({ ...plan, tasks: merged })
    } else if (merged.length > 0) {
      // Virtual plan — training tasks exist but nothing saved yet
      res.json({ id: null, user_id: uid, date, tasks: merged, notes: '', created_at: null, updated_at: null })
    } else {
      res.json(null)
    }
  })

  router.put('/:date', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { date } = req.params
    const { tasks = [], notes = '' } = req.body as { tasks?: PlanTask[]; notes?: string }
    const { rows } = await pool.query(
      `INSERT INTO daily_plans (user_id, date, tasks, notes)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, date) DO UPDATE
         SET tasks=$3, notes=$4, updated_at=now()
       RETURNING *`,
      [uid, date, JSON.stringify(tasks), notes]
    )
    res.json(rows[0])
  })

  return router
}
