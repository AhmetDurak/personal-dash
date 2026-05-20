import { Router, Request, Response } from 'express'

export function entriesRouter(): Router {
  const router = Router()

  router.post('/', async (req: Request, res: Response) => {
    try {
      const { repeat, repeatCount, skipDuplicate, ...entry } = req.body
      const skip = skipDuplicate === true || req.query.skipDuplicate === 'true'

      if (!skip && !repeat) {
        const dupe = await req.ledger.findDuplicate(entry.date, entry.name, Math.round(Number(entry.amount)))
        if (dupe) { res.status(409).json({ conflict: dupe }); return }
      }

      if (repeat && repeat > 0 && repeatCount && repeatCount > 0) {
        const txs = await Promise.all(
          Array.from({ length: repeatCount }, (_, i) => {
            const d = new Date(entry.date)
            d.setMonth(d.getMonth() + i * repeat)
            const date = d.toISOString().slice(0, 10)
            return req.ledger.addEntry({ ...entry, date })
          })
        )
        res.status(201).json(txs)
      } else {
        const tx = await req.ledger.addEntry(entry)
        res.status(201).json(tx)
      }
    } catch (err) {
      res.status(400).json({ error: (err as Error).message })
    }
  })

  router.patch('/recategorize', async (req: Request, res: Response) => {
    const { name, category } = req.body as { name: string; category: string }
    if (!name || !category) { res.status(400).json({ error: 'name and category required' }); return }
    try {
      const updated = await req.ledger.recategorizeByName(name, category)
      res.json({ updated })
    } catch (err) {
      res.status(400).json({ error: (err as Error).message })
    }
  })

  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const tx = await req.ledger.updateEntry(req.params.id, req.body)
      res.json(tx)
    } catch (err) {
      res.status(404).json({ error: (err as Error).message })
    }
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await req.ledger.deleteEntry(req.params.id)
      res.status(204).send()
    } catch (err) {
      res.status(404).json({ error: (err as Error).message })
    }
  })

  return router
}
