import { Router, Request, Response } from 'express'
import { Pool } from 'pg'
import { LedgerAgent } from '../../agents/ledger/LedgerAgent'
import { ETFAgent } from '../../agents/etf/ETFAgent'

export function notificationsRouter(ledger: LedgerAgent, etf: ETFAgent, pool: Pool): Router {
  const router = Router()

  // GET /api/notifications
  router.get('/', async (_req: Request, res: Response) => {
    const month = new Date().toISOString().slice(0, 7)

    const [summary, watchlist, remindersResult] = await Promise.all([
      ledger.getSummary(month).catch(() => null),
      etf.list().catch(() => [] as string[]),
      pool.query(
        'SELECT * FROM reminders WHERE done = FALSE ORDER BY due_at NULLS LAST, created_at DESC LIMIT 20'
      ).catch(() => ({ rows: [] })),
    ])

    // Fetch snapshots for watchlist; flag those with |changePct| >= 2%
    const snapshots = await Promise.all(
      watchlist.map((ticker: string) => etf.snapshot(ticker).catch(() => null))
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
    const { title, note, due_at, repeat = 'none' } = req.body as {
      title: string; note?: string; due_at?: string; repeat?: string
    }
    if (!title?.trim()) { res.status(400).json({ error: 'title required' }); return }
    const { rows } = await pool.query(
      'INSERT INTO reminders (title, note, due_at, repeat) VALUES ($1, $2, $3, $4) RETURNING *',
      [title.trim(), note ?? null, due_at ?? null, repeat]
    )
    res.json(rows[0])
  })

  // PATCH /api/notifications/reminders/:id/done  (toggles done)
  router.patch('/reminders/:id/done', async (req: Request, res: Response) => {
    await pool.query('UPDATE reminders SET done = NOT done WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  })

  // DELETE /api/notifications/reminders/:id
  router.delete('/reminders/:id', async (req: Request, res: Response) => {
    await pool.query('DELETE FROM reminders WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  })

  return router
}
