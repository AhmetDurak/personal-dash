import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export type TicketStatus = 'todo' | 'in_progress' | 'done'

export function kanbanRouter(pool: Pool): Router {
  const router = Router()

  // ─── Stories ────────────────────────────────────────────────────────────────

  router.get('/stories', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      `SELECT s.*,
              COUNT(t.id)::int AS total_count,
              COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS done_count
       FROM kanban_stories s
       LEFT JOIN kanban_tickets t ON t.story_id = s.id
       WHERE s.user_id = $1
       GROUP BY s.id
       ORDER BY s.updated_at DESC`,
      [uid]
    )
    res.json(rows)
  })

  router.post('/stories', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, description = '', folder = null } = req.body as { title: string; description?: string; folder?: string | null }
    if (!title?.trim()) { res.status(400).json({ error: 'title required' }); return }
    const { rows } = await pool.query(
      'INSERT INTO kanban_stories (title, description, folder, user_id) VALUES ($1, $2, $3, $4) RETURNING *, 0 AS total_count, 0 AS done_count',
      [title.trim(), description, folder, uid]
    )
    res.json(rows[0])
  })

  router.put('/stories/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, description } = req.body as { title: string; description: string }
    const { rows } = await pool.query(
      'UPDATE kanban_stories SET title=$1, description=$2, updated_at=now() WHERE id=$3 AND user_id=$4 RETURNING *',
      [title, description, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.patch('/stories/folder-rename', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { oldPath, newPath } = req.body as { oldPath: string; newPath: string }
    if (!oldPath?.trim() || !newPath?.trim()) { res.status(400).json({ error: 'oldPath and newPath required' }); return }
    await pool.query(
      `UPDATE kanban_stories SET folder = CASE WHEN folder = $1 THEN $2 ELSE $2 || SUBSTRING(folder FROM LENGTH($1) + 1) END, updated_at = now()
       WHERE user_id = $3 AND (folder = $1 OR folder LIKE $4)`,
      [oldPath, newPath, uid, oldPath + '/%']
    )
    res.json({ ok: true })
  })

  router.patch('/stories/:id/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { folder } = req.body as { folder: string | null }
    const { rows } = await pool.query(
      'UPDATE kanban_stories SET folder=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING *',
      [folder ?? null, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.delete('/stories/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { path } = req.query as { path: string }
    if (!path?.trim()) { res.status(400).json({ error: 'path required' }); return }
    await pool.query(
      `DELETE FROM kanban_stories WHERE user_id = $1 AND (folder = $2 OR folder LIKE $3)`,
      [uid, path, path + '/%']
    )
    res.json({ ok: true })
  })

  router.delete('/stories/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM kanban_stories WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  // ─── Tickets ────────────────────────────────────────────────────────────────

  router.get('/stories/:storyId/tickets', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM kanban_tickets WHERE story_id=$1 AND user_id=$2 ORDER BY position ASC, created_at ASC',
      [req.params.storyId, uid]
    )
    res.json(rows)
  })

  router.post('/stories/:storyId/tickets', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, description = '' } = req.body as { title: string; description?: string }
    if (!title?.trim()) { res.status(400).json({ error: 'title required' }); return }
    const { rows: posRows } = await pool.query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM kanban_tickets WHERE story_id=$1 AND status='todo'`,
      [req.params.storyId]
    )
    const { rows } = await pool.query(
      `INSERT INTO kanban_tickets (story_id, title, description, position, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.storyId, title.trim(), description, posRows[0].next_position, uid]
    )
    await pool.query('UPDATE kanban_stories SET updated_at=now() WHERE id=$1 AND user_id=$2', [req.params.storyId, uid])
    res.json(rows[0])
  })

  router.put('/tickets/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, description } = req.body as { title: string; description: string }
    const { rows } = await pool.query(
      'UPDATE kanban_tickets SET title=$1, description=$2, updated_at=now() WHERE id=$3 AND user_id=$4 RETURNING *',
      [title, description, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.patch('/tickets/:id/status', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { status, position } = req.body as { status: TicketStatus; position: number }
    const { rows } = await pool.query(
      'UPDATE kanban_tickets SET status=$1, position=$2, updated_at=now() WHERE id=$3 AND user_id=$4 RETURNING *',
      [status, position, req.params.id, uid]
    )
    if (rows[0]) await pool.query('UPDATE kanban_stories SET updated_at=now() WHERE id=$1 AND user_id=$2', [rows[0].story_id, uid])
    res.json(rows[0] ?? null)
  })

  router.delete('/tickets/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM kanban_tickets WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  return router
}
