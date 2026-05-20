import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export function notebookRouter(pool: Pool): Router {
  const router = Router()

  // ─── Notes ──────────────────────────────────────────────────────────────────

  router.get('/notes', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM notebook_notes WHERE user_id = $1 ORDER BY updated_at DESC',
      [uid]
    )
    res.json(rows)
  })

  router.post('/notes', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title = 'Untitled', content = '' } = req.body as { title?: string; content?: string }
    const { rows } = await pool.query(
      'INSERT INTO notebook_notes (title, content, user_id) VALUES ($1, $2, $3) RETURNING *',
      [title, content, uid]
    )
    res.json(rows[0])
  })

  router.put('/notes/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, content } = req.body as { title: string; content: string }
    const { rows } = await pool.query(
      'UPDATE notebook_notes SET title=$1, content=$2, updated_at=now() WHERE id=$3 AND user_id=$4 RETURNING *',
      [title, content, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.delete('/notes/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM notebook_notes WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  // ─── Mindmaps ────────────────────────────────────────────────────────────────

  router.get('/mindmaps', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM mindmaps WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [uid]
    )
    res.json(rows[0] ?? null)
  })

  router.post('/mindmaps', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title = 'My Mindmap', nodes = [] } = req.body as { title?: string; nodes?: unknown[] }
    const { rows } = await pool.query(
      'INSERT INTO mindmaps (title, nodes, user_id) VALUES ($1, $2, $3) RETURNING *',
      [title, JSON.stringify(nodes), uid]
    )
    res.json(rows[0])
  })

  router.put('/mindmaps/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, nodes } = req.body as { title: string; nodes: unknown[] }
    const { rows } = await pool.query(
      'UPDATE mindmaps SET title=$1, nodes=$2, updated_at=now() WHERE id=$3 AND user_id=$4 RETURNING *',
      [title, JSON.stringify(nodes), req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  // ─── Vocabulary ──────────────────────────────────────────────────────────────

  router.get('/vocabulary', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM vocabulary WHERE user_id = $1 ORDER BY created_at DESC',
      [uid]
    )
    res.json(rows)
  })

  router.post('/vocabulary', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { word, translation, language = 'de', image_url, example } = req.body as {
      word: string; translation: string; language?: string; image_url?: string; example?: string
    }
    if (!word?.trim() || !translation?.trim()) {
      res.status(400).json({ error: 'word and translation required' }); return
    }
    const { rows } = await pool.query(
      'INSERT INTO vocabulary (word, translation, language, image_url, example, user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [word.trim(), translation.trim(), language, image_url ?? null, example ?? null, uid]
    )
    res.json(rows[0])
  })

  router.put('/vocabulary/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { word, translation, language, image_url, example } = req.body as {
      word: string; translation: string; language: string; image_url?: string; example?: string
    }
    const { rows } = await pool.query(
      'UPDATE vocabulary SET word=$1, translation=$2, language=$3, image_url=$4, example=$5 WHERE id=$6 AND user_id=$7 RETURNING *',
      [word, translation, language, image_url ?? null, example ?? null, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.delete('/vocabulary/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM vocabulary WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  // SM-2 spaced repetition review
  router.post('/vocabulary/:id/review', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const quality = Number((req.body as { quality: number }).quality) // 0–5
    const { rows } = await pool.query('SELECT * FROM vocabulary WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    if (!rows[0]) { res.status(404).json({ error: 'not found' }); return }

    let { interval, repetitions } = rows[0] as { interval: number; repetitions: number }
    let easeFactor = Number((rows[0] as { ease_factor: string }).ease_factor)

    if (quality >= 3) {
      if (repetitions === 0)      interval = 1
      else if (repetitions === 1) interval = 6
      else                        interval = Math.round(interval * easeFactor)
      repetitions += 1
    } else {
      repetitions = 0
      interval    = 1
    }

    easeFactor = Math.max(
      1.3,
      easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    )

    const due = new Date()
    due.setDate(due.getDate() + interval)
    const dueAt = due.toISOString().slice(0, 10)

    const { rows: updated } = await pool.query(
      'UPDATE vocabulary SET interval=$1, repetitions=$2, ease_factor=$3, due_at=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [interval, repetitions, easeFactor, dueAt, req.params.id, uid]
    )
    res.json(updated[0])
  })

  // ─── Reminders (all — including done) ────────────────────────────────────────

  router.get('/reminders', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM reminders WHERE user_id = $1 ORDER BY done ASC, due_at NULLS LAST, created_at DESC',
      [uid]
    )
    res.json(rows)
  })

  return router
}
