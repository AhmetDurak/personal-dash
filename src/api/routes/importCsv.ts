import { Router, Request, Response } from 'express'
import multer from 'multer'
import { readFile, unlink } from 'fs/promises'
import os from 'os'
import { EXPENSE_CATS, INCOME_CATS } from '../../types'

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 5 * 1024 * 1024 } })

const ALL_CATS = new Set([...INCOME_CATS, ...EXPENSE_CATS])

function parseRow(line: string): string[] {
  const result: string[] = []
  let inQuote = false
  let cur = ''
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote }
    else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = '' }
    else { cur += ch }
  }
  result.push(cur.trim())
  return result
}

export function importCsvRouter(): Router {
  const router = Router()

  router.post('/', upload.single('csv'), async (req: Request, res: Response) => {
    if (!req.file) { res.status(400).json({ error: 'No CSV file uploaded' }); return }
    const tmpPath = req.file.path
    try {
      const raw = await readFile(tmpPath, 'utf-8')
      const lines = raw.split(/\r?\n/).filter(l => l.trim())
      if (!lines.length) { res.json({ imported: 0, skipped: 0, errors: ['Empty file'] }); return }

      // Detect header row — skip if first cell is not a date
      const startIdx = /^\d{4}-\d{2}-\d{2}/.test(parseRow(lines[0])[0]) ? 0 : 1

      let imported = 0
      let skipped  = 0
      const errors: string[] = []

      for (let i = startIdx; i < lines.length; i++) {
        const cols = parseRow(lines[i])
        const [dateRaw, name, amountRaw, typeRaw, categoryRaw] = cols

        if (!dateRaw || !name || !amountRaw) {
          errors.push(`Row ${i + 1}: missing required fields`)
          skipped++
          continue
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
          errors.push(`Row ${i + 1}: invalid date "${dateRaw}"`)
          skipped++
          continue
        }

        const amountFloat = parseFloat(amountRaw.replace(/[^0-9.,-]/g, '').replace(',', '.'))
        if (isNaN(amountFloat) || amountFloat <= 0) {
          errors.push(`Row ${i + 1}: invalid amount "${amountRaw}"`)
          skipped++
          continue
        }
        const amountCents = Math.round(Math.abs(amountFloat) * 100)

        const type = typeRaw?.toLowerCase() === 'income' ? 'income' : 'expense'
        const category = ALL_CATS.has(categoryRaw as never) ? categoryRaw : 'Others'

        try {
          const dupe = await req.ledger.findDuplicate(dateRaw, name, amountCents)
          if (dupe) { skipped++; continue }

          await req.ledger.addEntry({
            date: dateRaw,
            name,
            amount: amountCents,
            type,
            category: category as never,
          })
          imported++
        } catch (e) {
          errors.push(`Row ${i + 1}: ${(e as Error).message}`)
          skipped++
        }
      }

      res.json({ imported, skipped, errors: errors.slice(0, 20) })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    } finally {
      await unlink(tmpPath).catch(() => undefined)
    }
  })

  return router
}
