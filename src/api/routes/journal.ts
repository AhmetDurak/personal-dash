import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export function journalRouter(pool: Pool): Router {
  const router = Router()

  router.get('/recent', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const limit = Math.min(Number(req.query.limit ?? 30), 90)
    const { rows } = await pool.query(
      'SELECT * FROM journal_entries WHERE user_id=$1 ORDER BY date DESC LIMIT $2',
      [uid, limit]
    )
    res.json(rows)
  })

  router.get('/', async (req: Request, res: Response) => {
    const uid  = (req.user as Express.User).id
    const date = req.query.date as string
    if (!date) { res.status(400).json({ error: 'date required' }); return }
    const { rows } = await pool.query(
      'SELECT * FROM journal_entries WHERE user_id=$1 AND date=$2',
      [uid, date]
    )
    res.json(rows[0] ?? null)
  })

  router.put('/:date', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { date } = req.params
    const { content = '', went_well = [], went_bad = [] } = req.body as {
      content?: string; went_well?: string[]; went_bad?: string[]
    }
    const { rows } = await pool.query(
      `INSERT INTO journal_entries (user_id, date, content, went_well, went_bad)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, date) DO UPDATE
         SET content=$3, went_well=$4, went_bad=$5, updated_at=now()
       RETURNING *`,
      [uid, date, content, went_well, went_bad]
    )
    res.json(rows[0])
  })

  return router
}
