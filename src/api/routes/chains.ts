import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export type ChainMark = 'check' | 'cross' | null

export function chainsRouter(pool: Pool): Router {
  const router = Router()

  router.get('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query('SELECT * FROM chains WHERE user_id = $1 ORDER BY created_at DESC', [uid])
    res.json(rows)
  })

  router.post('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { name, length, marks } = req.body as { name: string; length: number; marks?: ChainMark[] }
    if (!name?.trim() || !length || length < 1) { res.status(400).json({ error: 'name and length required' }); return }
    const initialMarks = Array.isArray(marks) && marks.length === length ? marks : Array(length).fill(null)
    const { rows } = await pool.query(
      'INSERT INTO chains (name, length, marks, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), length, JSON.stringify(initialMarks), uid]
    )
    res.json(rows[0])
  })

  router.put('/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { name, length, marks } = req.body as { name: string; length: number; marks: ChainMark[] }
    const { rows } = await pool.query(
      'UPDATE chains SET name=$1, length=$2, marks=$3 WHERE id=$4 AND user_id=$5 RETURNING *',
      [name, length, JSON.stringify(marks), req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM chains WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  return router
}
