import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export function templatesRouter(pool: Pool): Router {
  const router = Router()

  router.get('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM recurring_templates WHERE user_id = $1 ORDER BY created_at',
      [uid]
    )
    res.json(rows)
  })

  router.post('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { name, amount, type, category } = req.body
    if (!name || !amount || !type || !category) {
      res.status(400).json({ error: 'name, amount, type, category required' }); return
    }
    const { rows } = await pool.query(
      `INSERT INTO recurring_templates (user_id, name, amount, type, category)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [uid, name, Math.round(Number(amount)), type, category]
    )
    res.status(201).json(rows[0])
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query(
      'DELETE FROM recurring_templates WHERE id = $1 AND user_id = $2',
      [req.params.id, uid]
    )
    res.status(204).send()
  })

  return router
}
