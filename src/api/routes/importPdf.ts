import { Router, Request, Response } from 'express'
import multer from 'multer'
import { parsePDF, ParsedTx } from '../../agents/bank/pdfParser'
import { Transaction } from '../../types'
import { unlink } from 'fs/promises'
import os from 'os'

const upload = multer({ dest: os.tmpdir() })

interface ConfirmEntry {
  tx: ParsedTx
  overrideId?: string  // if set: PATCH that existing entry instead of creating new
}

export function importPdfRouter(): Router {
  const router = Router()

  // Phase 1: parse PDF and return ready entries + conflicts for user review
  router.post('/preview', upload.single('pdf'), async (req: Request, res: Response) => {
    if (!req.file) { res.status(400).json({ error: 'No PDF file uploaded' }); return }
    const tmpPath = req.file.path
    try {
      const txs = parsePDF(tmpPath)
      const ready: ParsedTx[] = []
      const conflicts: { existing: Transaction; incoming: ParsedTx }[] = []

      for (const tx of txs) {
        const dupe = await req.ledger.findDuplicate(tx.date, tx.name, tx.amount)
        if (dupe) conflicts.push({ existing: dupe, incoming: tx })
        else ready.push(tx)
      }

      res.json({ ready, conflicts })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    } finally {
      await unlink(tmpPath).catch(() => undefined)
    }
  })

  // Phase 2: user has reviewed conflicts; import approved entries
  router.post('/confirm', async (req: Request, res: Response) => {
    const { entries } = req.body as { entries: ConfirmEntry[] }
    if (!Array.isArray(entries)) { res.status(400).json({ error: 'entries array required' }); return }

    let imported = 0
    let overridden = 0
    const errors: string[] = []

    for (const { tx, overrideId } of entries) {
      try {
        if (overrideId) {
          await req.ledger.updateEntry(overrideId, {
            date: tx.date,
            name: tx.name,
            amount: tx.amount,
            type: tx.type,
            category: tx.category as never,
          })
          overridden++
        } else {
          await req.ledger.addEntry({
            date: tx.date,
            name: tx.name,
            amount: tx.amount,
            type: tx.type,
            category: tx.category as never,
          })
          imported++
        }
      } catch (e) {
        errors.push(`${tx.date} ${tx.name}: ${(e as Error).message}`)
      }
    }

    res.json({ imported, overridden, errors: errors.slice(0, 10) })
  })

  return router
}
