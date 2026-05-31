import { Router, Request, Response } from 'express'
import multer from 'multer'
import { readFile, unlink } from 'fs/promises'
import os from 'os'
import { EXPENSE_CATS, INCOME_CATS } from '../../types'

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 10 * 1024 * 1024 } })
const ALL_CATS = new Set([...INCOME_CATS, ...EXPENSE_CATS])

// ─── Parsing helpers ──────────────────────────────────────────────────────────

function splitRow(line: string, sep: string): string[] {
  const result: string[] = []
  let inQuote = false
  let cur = ''
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote }
    else if (ch === sep && !inQuote) { result.push(cur.trim()); cur = '' }
    else { cur += ch }
  }
  result.push(cur.trim())
  return result
}

function detectSeparator(lines: string[]): string {
  const sample = lines.slice(0, 5).join('\n')
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 }
  for (const sep of Object.keys(counts)) counts[sep] = (sample.match(new RegExp(`\\${sep}`, 'g')) ?? []).length
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function parseAmount(raw: string): number | null {
  if (!raw) return null
  // Remove currency symbols, spaces, handle both "1.234,56" and "1,234.56"
  let s = raw.replace(/[^0-9.,'+-]/g, '').trim()
  // German format: last comma is decimal, dots are thousands separators
  if (/\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  // American format: last dot is decimal, commas are thousands separators
  else if (/\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '')
  // Single comma as decimal (no thousands separator)
  else s = s.replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  // YYYY-MM-DD (already correct)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  // DD.MM.YYYY (German)
  const de = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (de) return `${de[3]}-${de[2].padStart(2, '0')}-${de[1].padStart(2, '0')}`
  // MM/DD/YYYY (US)
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`
  // DD/MM/YYYY
  const eu = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (eu) return `${eu[3]}-${eu[2].padStart(2, '0')}-${eu[1].padStart(2, '0')}`
  // YYYY/MM/DD
  const iso2 = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (iso2) return `${iso2[1]}-${iso2[2]}-${iso2[3]}`
  // DD-MM-YYYY
  const dmy2 = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dmy2) return `${dmy2[3]}-${dmy2[2].padStart(2, '0')}-${dmy2[1].padStart(2, '0')}`
  return null
}

// ─── Column auto-detection ────────────────────────────────────────────────────

// Known column name mappings (lowercase, partial match is fine)
const DATE_ALIASES = ['buchungstag', 'buchungsdatum', 'valutadatum', 'wertstellungsdatum',
  'date', 'datum', 'transaction date', 'started date', 'completed date', 'booking date', 'trade date']
const NAME_ALIASES = ['begünstigter', 'beguenstigter', 'auftraggeber', 'empfänger', 'empfaenger',
  'payee', 'description', 'memo', 'verwendungszweck', 'name', 'counterparty', 'merchant name',
  'transaction description', 'reference', 'kundenreferenz', 'payment reference']
const AMOUNT_ALIASES = ['betrag', 'amount', 'umsatz', 'summe', 'value', 'transaktionsbetrag',
  'amount (eur)', 'betrag (eur)', 'credit', 'debit', 'einnahmen', 'ausgaben', 'net amount']
const TYPE_ALIASES   = ['type', 'typ', 'transaction type', 'umsatzart', 'art', 'direction']
const CAT_ALIASES    = ['category', 'kategorie', 'kat']

export interface ColumnMapping {
  dateCol:    number | null
  nameCol:    number | null
  amountCol:  number | null
  typeCol:    number | null
  catCol:     number | null
  separator:  string
  hasHeader:  boolean
}

function autoDetectMapping(headers: string[], sep: string): Omit<ColumnMapping, 'separator' | 'hasHeader'> {
  function findCol(aliases: string[]): number | null {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toLowerCase().trim().replace(/["']/g, '')
      if (aliases.some(a => h.includes(a) || a.includes(h))) return i
    }
    return null
  }
  return {
    dateCol:   findCol(DATE_ALIASES),
    nameCol:   findCol(NAME_ALIASES),
    amountCol: findCol(AMOUNT_ALIASES),
    typeCol:   findCol(TYPE_ALIASES),
    catCol:    findCol(CAT_ALIASES),
  }
}

// ─── Row → transaction ────────────────────────────────────────────────────────

interface ParsedRow {
  date: string; name: string; amount: number; type: 'income' | 'expense'; category: string
}

function parseDataRow(cols: string[], mapping: ColumnMapping): ParsedRow | string {
  const get = (i: number | null) => (i !== null && i < cols.length ? cols[i] : '')

  const dateRaw   = get(mapping.dateCol)
  const nameRaw   = get(mapping.nameCol)
  const amountRaw = get(mapping.amountCol)

  if (!dateRaw && !nameRaw && !amountRaw) return 'empty'

  const date = parseDate(dateRaw)
  if (!date) return `invalid date "${dateRaw}"`

  const name = nameRaw.replace(/^"|"$/g, '').trim()
  if (!name) return 'missing name'

  const amountNum = parseAmount(amountRaw)
  if (amountNum === null) return `invalid amount "${amountRaw}"`

  // Determine income vs expense:
  // 1. Explicit type column
  // 2. Negative = expense, positive = income
  let type: 'income' | 'expense'
  if (mapping.typeCol !== null) {
    const typeRaw = get(mapping.typeCol).toLowerCase()
    type = ['income', 'einnahme', 'credit', 'gutschrift', 'haben'].some(w => typeRaw.includes(w))
      ? 'income' : 'expense'
  } else {
    type = amountNum >= 0 ? 'income' : 'expense'
  }

  const catRaw  = get(mapping.catCol)
  const category = ALL_CATS.has(catRaw as never) ? catRaw : 'Others'

  return { date, name, amount: Math.round(Math.abs(amountNum) * 100), type, category }
}

// ─── Read + decode file ───────────────────────────────────────────────────────

async function readCsvFile(path: string): Promise<string> {
  const buf = await readFile(path)
  // Try UTF-8 first; if it produces replacement chars, try Latin-1
  const utf8 = buf.toString('utf-8')
  if (!utf8.includes('�')) return utf8
  return buf.toString('latin1')
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function importCsvRouter(): Router {
  const router = Router()

  // Preview: detect headers + auto-mapping (no import yet)
  router.post('/preview', upload.single('csv'), async (req: Request, res: Response) => {
    if (!req.file) { res.status(400).json({ error: 'No file' }); return }
    const tmpPath = req.file.path
    try {
      const raw   = await readCsvFile(tmpPath)
      const lines = raw.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) { res.json({ error: 'File too short' }); return }

      const sep      = detectSeparator(lines)
      const firstRow = splitRow(lines[0], sep)
      // Check if first row looks like a header (first cell not a date)
      const hasHeader = parseDate(firstRow[0]) === null
      const headers   = hasHeader ? firstRow : firstRow.map((_, i) => `Column ${i + 1}`)
      const dataStart = hasHeader ? 1 : 0

      const detected = autoDetectMapping(headers, sep)
      // Sample rows for display (up to 3)
      const sampleRows = lines.slice(dataStart, dataStart + 3).map(l => splitRow(l, sep))

      res.json({ headers, sampleRows, detected, separator: sep, hasHeader, totalRows: lines.length - dataStart })
    } finally {
      await unlink(tmpPath).catch(() => undefined)
    }
  })

  // Confirm import with a given column mapping
  router.post('/confirm', upload.single('csv'), async (req: Request, res: Response) => {
    if (!req.file) { res.status(400).json({ error: 'No file' }); return }
    const tmpPath = req.file.path
    try {
      const mapping: ColumnMapping = JSON.parse(req.body.mapping as string)
      const raw   = await readCsvFile(tmpPath)
      const lines = raw.split(/\r?\n/).filter(l => l.trim())

      const sep       = mapping.separator
      const dataStart = mapping.hasHeader ? 1 : 0

      let imported = 0
      let skipped  = 0
      const errors: string[] = []

      for (let i = dataStart; i < lines.length; i++) {
        const cols   = splitRow(lines[i], sep)
        const result = parseDataRow(cols, mapping)

        if (result === 'empty') continue
        if (typeof result === 'string') {
          errors.push(`Row ${i + 1}: ${result}`)
          skipped++
          continue
        }

        try {
          const dupe = await req.ledger.findDuplicate(result.date, result.name, result.amount)
          if (dupe) { skipped++; continue }
          await req.ledger.addEntry({ ...result, category: result.category as never })
          imported++
        } catch (e) {
          errors.push(`Row ${i + 1}: ${(e as Error).message}`)
          skipped++
        }
      }

      res.json({ imported, skipped, errors: errors.slice(0, 20) })
    } finally {
      await unlink(tmpPath).catch(() => undefined)
    }
  })

  return router
}
