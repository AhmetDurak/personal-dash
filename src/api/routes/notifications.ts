import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export function notificationsRouter(pool: Pool): Router {
  const router = Router()

  // GET /api/notifications
  router.get('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const month = new Date().toISOString().slice(0, 7)

    const [summary, watchlist, remindersResult] = await Promise.all([
      req.ledger.getSummary(month).catch(() => null),
      req.etf.list().catch(() => [] as string[]),
      pool.query(
        'SELECT * FROM reminders WHERE done = FALSE AND user_id = $1 ORDER BY due_at NULLS LAST, created_at DESC LIMIT 20',
        [uid]
      ).catch(() => ({ rows: [] })),
    ])

    // Fetch snapshots for watchlist; flag those with |changePct| >= 2%
    const snapshots = await Promise.all(
      watchlist.map((ticker: string) => req.etf.snapshot(ticker).catch(() => null))
    )
    const etfAlerts = snapshots
      .filter((s): s is NonNullable<typeof s> => s !== null && Math.abs(s.changePct) >= 2)
      .map((s: NonNullable<typeof snapshots[0]>) => ({
        ticker:    s.ticker,
        name:      s.name,
        price:     s.price,
        changePct: s.changePct,
        currency:  s.currency,
        direction: s.changePct >= 0 ? 'up' : 'down',
      }))

    res.json({
      summary: summary
        ? { month, income: summary.income, totalExpenses: summary.totalExpenses, net: summary.net, savingsRate: summary.savingsRate }
        : null,
      etfAlerts,
      reminders: remindersResult.rows,
    })
  })

  // POST /api/notifications/reminders
  router.post('/reminders', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, note, due_at, repeat = 'none' } = req.body as {
      title: string; note?: string; due_at?: string; repeat?: string
    }
    if (!title?.trim()) { res.status(400).json({ error: 'title required' }); return }
    const { rows } = await pool.query(
      'INSERT INTO reminders (title, note, due_at, repeat, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title.trim(), note ?? null, due_at ?? null, repeat, uid]
    )
    res.json(rows[0])
  })

  // PATCH /api/notifications/reminders/:id/done  (toggles done)
  router.patch('/reminders/:id/done', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('UPDATE reminders SET done = NOT done WHERE id = $1 AND user_id = $2', [req.params.id, uid])
    res.json({ ok: true })
  })

  // DELETE /api/notifications/reminders/:id
  router.delete('/reminders/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM reminders WHERE id = $1 AND user_id = $2', [req.params.id, uid])
    res.json({ ok: true })
  })

  return router
}
