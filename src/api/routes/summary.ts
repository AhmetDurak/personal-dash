import { Router, Request, Response } from 'express'

export function summaryRouter(): Router {
  const router = Router()

  router.get('/summary/:month', async (req: Request, res: Response) => {
    try {
      const summary = await req.ledger.getSummary(req.params.month)
      res.json(summary)
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  router.get('/transactions/:month', async (req: Request, res: Response) => {
    try {
      const txs = await req.ledger.getTransactions(req.params.month)
      res.json(txs)
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}
