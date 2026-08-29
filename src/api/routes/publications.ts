import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export function publicationsRouter(pool: Pool): Router {
  const router = Router()

  // GET /api/publications — list, newest first
  router.get('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM publications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200',
      [uid]
    )
    res.json(rows)
  })

  // POST /api/publications — a scheduled task publishes a new item here
  router.post('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, body, type, link } = req.body as {
      title: string; body?: string; type?: string; link?: string
    }
    if (!title?.trim()) { res.status(400).json({ error: 'title required' }); return }
    const kind = type?.trim() || 'news'
    const { rows } = await pool.query(
      'INSERT INTO publications (title, body, type, link, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title.trim(), body ?? '', kind, link ?? null, uid]
    )
    res.json(rows[0])
  })

  // PATCH /api/publications/:id/read — toggle or set read state
  router.patch('/:id/read', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { read } = req.body as { read?: boolean }
    const { rows } = await pool.query(
      read === undefined
        ? 'UPDATE publications SET read = NOT read WHERE id = $1 AND user_id = $2 RETURNING *'
        : 'UPDATE publications SET read = $3 WHERE id = $1 AND user_id = $2 RETURNING *',
      read === undefined ? [req.params.id, uid] : [req.params.id, uid, read]
    )
    res.json(rows[0] ?? null)
  })

  // PATCH /api/publications/read-all — mark everything read
  router.patch('/read-all', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('UPDATE publications SET read = TRUE WHERE user_id = $1 AND read = FALSE', [uid])
    res.json({ ok: true })
  })

  // DELETE /api/publications/:id
  router.delete('/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM publications WHERE id = $1 AND user_id = $2', [req.params.id, uid])
    res.json({ ok: true })
  })

  return router
}
