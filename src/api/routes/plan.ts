import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export interface PlanTask {
  id: string
  text: string
  done: boolean
  tag?: 'sport' | 'challenge'
  trainingScheduleId?: number
  templateId?: number | null
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

    const [planResult, scheduleResult] = await Promise.all([
      pool.query('SELECT * FROM daily_plans WHERE user_id=$1 AND date=$2', [uid, date]),
      pool.query(
        'SELECT * FROM training_schedules WHERE user_id=$1 AND day_of_week=$2 ORDER BY id',
        [uid, dayOfWeek(date)]
      ),
    ])

    const plan  = planResult.rows[0] ?? null
    const tasks: PlanTask[] = plan ? plan.tasks : []

    // Inject training tasks not already saved in this plan
    const savedIds = new Set(
      tasks.filter(t => t.trainingScheduleId != null).map(t => t.trainingScheduleId)
    )
    const extra: PlanTask[] = scheduleResult.rows
      .filter(s => !savedIds.has(s.id))
      .map(s => ({
        id:                 `ts-${s.id}-${date}`,
        text:               s.name,
        done:               false,
        tag:                'sport' as const,
        trainingScheduleId: s.id,
        templateId:         s.template_id ?? null,
      }))

    const merged = [...tasks, ...extra]

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
