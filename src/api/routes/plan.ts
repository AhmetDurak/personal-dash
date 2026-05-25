import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export interface PlanTask {
  id: string
  text: string
  done: boolean
}

export function planRouter(pool: Pool): Router {
  const router = Router()

  router.get('/:date', async (req: Request, res: Response) => {
    const uid  = (req.user as Express.User).id
    const { date } = req.params
    const { rows } = await pool.query(
      'SELECT * FROM daily_plans WHERE user_id=$1 AND date=$2',
      [uid, date]
    )
    res.json(rows[0] ?? null)
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
