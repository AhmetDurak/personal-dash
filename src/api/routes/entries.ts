import { Router, Request, Response } from 'express'
import { LedgerAgent } from '../../agents/ledger/LedgerAgent'

export function entriesRouter(ledger: LedgerAgent): Router {
  const router = Router()

  router.post('/', async (req: Request, res: Response) => {
    try {
      const tx = await ledger.addEntry(req.body)
      res.status(201).json(tx)
    } catch (err) {
      res.status(400).json({ error: (err as Error).message })
    }
  })

  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const tx = await ledger.updateEntry(req.params.id, req.body)
      res.json(tx)
    } catch (err) {
      res.status(404).json({ error: (err as Error).message })
    }
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await ledger.deleteEntry(req.params.id)
      res.status(204).send()
    } catch (err) {
      res.status(404).json({ error: (err as Error).message })
    }
  })

  return router
}
