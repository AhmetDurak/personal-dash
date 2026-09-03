import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

// Sorts (aType,aId) vs (bType,bId) so the same pair is never stored twice in
// reverse order — an undirected link canonicalized at write time.
function canonicalize(aType: string, aId: string, bType: string, bId: string) {
  const left = `${aType}:${aId}`
  const right = `${bType}:${bId}`
  return left <= right
    ? { aType, aId, bType, bId }
    : { aType: bType, aId: bId, bType: aType, bId: aId }
}

export function linksRouter(pool: Pool): Router {
  const router = Router()

  router.get('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { type, id } = req.query as { type?: string; id?: string }
    if (!type || !id) { res.status(400).json({ error: 'type and id required' }); return }
    const { rows } = await pool.query(
      `SELECT * FROM links WHERE user_id = $1
       AND ((a_type = $2 AND a_id = $3) OR (b_type = $2 AND b_id = $3))
       ORDER BY created_at DESC`,
      [uid, type, id]
    )
    res.json(rows)
  })

  router.post('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { aType, aId, bType, bId, note } = req.body as {
      aType: string; aId: string; bType: string; bId: string; note?: string
    }
    if (!aType || !aId || !bType || !bId) { res.status(400).json({ error: 'aType, aId, bType, bId required' }); return }
    if (aType === bType && aId === bId) { res.status(400).json({ error: 'cannot link an item to itself' }); return }

    const pair = canonicalize(aType, aId, bType, bId)
    const { rows } = await pool.query(
      `INSERT INTO links (user_id, a_type, a_id, b_type, b_id, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'user')
       ON CONFLICT (user_id, a_type, a_id, b_type, b_id) DO NOTHING
       RETURNING *`,
      [uid, pair.aType, pair.aId, pair.bType, pair.bId, note ?? null]
    )
    if (rows[0]) { res.json(rows[0]); return }
    const { rows: existing } = await pool.query(
      `SELECT * FROM links WHERE user_id=$1 AND a_type=$2 AND a_id=$3 AND b_type=$4 AND b_id=$5`,
      [uid, pair.aType, pair.aId, pair.bType, pair.bId]
    )
    res.json(existing[0] ?? null)
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM links WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  return router
}
