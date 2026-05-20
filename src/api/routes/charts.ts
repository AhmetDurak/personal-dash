import { Router, Request, Response } from 'express'
import { ChartAgent } from '../../agents/chart/ChartAgent'

export function chartsRouter(): Router {
  const router = Router()
  const chart = new ChartAgent()

  // GET /api/charts/balance?months=2026-01,2026-02,2026-03
  router.get('/balance', async (req: Request, res: Response) => {
    const months = parseMonths(req.query.months as string)
    if (!months.length) { res.status(400).json({ error: 'months query param required (YYYY-MM,...)' }); return }
    try {
      const summaries = await Promise.all(months.map(m => req.ledger.getSummary(m)))
      res.json(chart.getBalanceSeries(summaries))
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // GET /api/charts/donut/:month
  router.get('/donut/:month', async (req: Request, res: Response) => {
    try {
      const summary = await req.ledger.getSummary(req.params.month)
      res.json(chart.getCategoryDonut(summary))
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // GET /api/charts/bar?months=2026-01,2026-02,2026-03
  router.get('/bar', async (req: Request, res: Response) => {
    const months = parseMonths(req.query.months as string)
    if (!months.length) { res.status(400).json({ error: 'months query param required (YYYY-MM,...)' }); return }
    try {
      const summaries = await Promise.all(months.map(m => req.ledger.getSummary(m)))
      res.json(chart.getIncomeVsExpenseBar(summaries))
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // GET /api/charts/stacked-expenses?months=2026-01,2026-02,...
  router.get('/stacked-expenses', async (req: Request, res: Response) => {
    const months = parseMonths(req.query.months as string)
    if (!months.length) { res.status(400).json({ error: 'months query param required' }); return }
    try {
      const summaries = await Promise.all(months.map(m => req.ledger.getSummary(m)))
      res.json(chart.getStackedExpenses(summaries))
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // GET /api/charts/stacked-income?months=2026-01,2026-02,...
  router.get('/stacked-income', async (req: Request, res: Response) => {
    const months = parseMonths(req.query.months as string)
    if (!months.length) { res.status(400).json({ error: 'months query param required' }); return }
    try {
      const summaries = await Promise.all(months.map(m => req.ledger.getSummary(m)))
      res.json(chart.getStackedIncome(summaries))
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // GET /api/charts/top-payees?month=2026-05&limit=10
  router.get('/top-payees', async (req: Request, res: Response) => {
    const month = req.query.month as string
    if (!month || !/^\d{4}-\d{2}$/.test(month)) { res.status(400).json({ error: 'month query param required (YYYY-MM)' }); return }
    const limit = Math.min(Number(req.query.limit ?? 10), 50)
    try {
      res.json(await req.ledger.topPayees(month, limit))
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}

function parseMonths(raw: string): string[] {
  if (!raw) return []
  return raw.split(',').map(m => m.trim()).filter(m => /^\d{4}-\d{2}$/.test(m))
}
