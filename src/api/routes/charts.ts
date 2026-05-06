import { Router, Request, Response } from 'express'
import { LedgerAgent } from '../../agents/ledger/LedgerAgent'
import { ChartAgent } from '../../agents/chart/ChartAgent'

export function chartsRouter(ledger: LedgerAgent): Router {
  const router = Router()
  const chart = new ChartAgent()

  // GET /api/charts/balance?months=2026-01,2026-02,2026-03
  router.get('/balance', async (req: Request, res: Response) => {
    const months = parseMonths(req.query.months as string)
    if (!months.length) { res.status(400).json({ error: 'months query param required (YYYY-MM,...)' }); return }
    try {
      const summaries = await Promise.all(months.map(m => ledger.getSummary(m)))
      res.json(chart.getBalanceSeries(summaries))
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // GET /api/charts/donut/:month
  router.get('/donut/:month', async (req: Request, res: Response) => {
    try {
      const summary = await ledger.getSummary(req.params.month)
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
      const summaries = await Promise.all(months.map(m => ledger.getSummary(m)))
      res.json(chart.getIncomeVsExpenseBar(summaries))
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
