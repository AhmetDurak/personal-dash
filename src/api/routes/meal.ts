import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export function mealRouter(pool: Pool): Router {
  const router = Router()

  // ─── Foods ────────────────────────────────────────────────────────────────

  router.get('/foods', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM foods WHERE user_id=$1 ORDER BY name ASC',
      [uid]
    )
    res.json(rows)
  })

  router.post('/foods', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { name, category = 'other', calories_per_100g = 0, emoji } = req.body
    const { rows } = await pool.query(
      'INSERT INTO foods (user_id,name,category,calories_per_100g,emoji) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [uid, name, category, calories_per_100g, emoji ?? null]
    )
    res.json(rows[0])
  })

  router.delete('/foods/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM foods WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  // ─── Meal logs ────────────────────────────────────────────────────────────

  router.get('/logs', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const date = req.query.date as string
    if (!date) { res.status(400).json({ error: 'date required' }); return }
    const { rows } = await pool.query(
      'SELECT * FROM meal_logs WHERE user_id=$1 AND date=$2',
      [uid, date]
    )
    res.json(rows)
  })

  router.put('/logs/:date/:meal_type', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { date, meal_type } = req.params
    const items = req.body.items ?? []
    const { rows } = await pool.query(
      `INSERT INTO meal_logs (user_id,date,meal_type,items)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id,date,meal_type) DO UPDATE
       SET items=$4, updated_at=now()
       RETURNING *`,
      [uid, date, meal_type, JSON.stringify(items)]
    )
    res.json(rows[0])
  })

  // ─── Shopping list ────────────────────────────────────────────────────────

  router.get('/shopping', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT items FROM shopping_list WHERE user_id=$1',
      [uid]
    )
    res.json(rows[0]?.items ?? [])
  })

  router.put('/shopping', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const items = req.body.items ?? []
    await pool.query(
      `INSERT INTO shopping_list (user_id,items)
       VALUES ($1,$2)
       ON CONFLICT (user_id) DO UPDATE SET items=$2, updated_at=now()`,
      [uid, JSON.stringify(items)]
    )
    res.json({ ok: true })
  })

  return router
}
