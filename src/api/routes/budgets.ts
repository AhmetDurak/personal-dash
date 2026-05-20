import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export function budgetsRouter(pool: Pool): Router {
  const router = Router()

  router.get('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT category, amount FROM budgets WHERE user_id = $1 ORDER BY category',
      [uid]
    )
    res.json(rows)
  })

  router.put('/:category', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { category } = req.params
    const amount = Math.round(Number(req.body.amount))
    if (!amount || amount <= 0) { res.status(400).json({ error: 'amount must be positive' }); return }
    const { rows } = await pool.query(
      `INSERT INTO budgets (user_id, category, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, category) DO UPDATE SET amount = $3
       RETURNING category, amount`,
      [uid, category, amount]
    )
    res.json(rows[0])
  })

  router.delete('/:category', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM budgets WHERE user_id = $1 AND category = $2', [uid, req.params.category])
    res.status(204).send()
  })

  return router
}
