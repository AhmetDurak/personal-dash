import { execSync } from 'child_process'

const CAT_MAP: Record<string, string> = {
  'Lohn / Gehalt':                          'Salary',
  'Internetkäufe':                          'Market',
  'Drogerieartikel':                        'Market',
  'Lebensmittel / Getränke':                'Market',
  'Tanken':                                 'Market',
  'Kleidung / Schuhe':                      'Market',
  'Elektronik / Computer / Games':          'Market',
  'Auto':                                   'Market',
  'Restaurants / Cafes / Bars':            'Entertainment',
  'Bücher / Musik / Filme / Apps':         'Entertainment',
  'Hobbys / Vereine / Verbände':           'Entertainment',
  'Sport / Fitness':                        'Health',
  'Krankenversicherung':                    'Health',
  'Miete / Nebenkosten':                    'Fixed',
  'Lebensversicherung':                     'Fixed',
  'Rentenversicherung':                     'Fixed',
  'Sonstige Ausgaben Versicherung':         'Fixed',
  'Telefon / Internet / Fernsehen / Radio': 'Fixed',
  'Öffentliche Verkehrsmittel':             'Fixed',
  'Energie & Wasser':                       'Fixed',
  'Sonstige Kredite':                       'Fixed',
  'Autokredit':                             'Fixed',
  'Sonstige Anlagen':                       'Investment',
  'Sonstige Ausgaben Bildung und Beruf':   'Education',
  'Unterhaltszahlungen':                    'Others',
  'Bargeld':                                'Others',
  'Öffentliche Kassen / Steuer':            'Others',
  'Sonstiges':                              'Others',
  'Unkategorisiert':                        'Others',
  'Sonstige Einnahmen':                     'Other Income',
}

const INCOME_CATS = new Set(['Salary', 'Freelance', 'Investment Income', 'Other Income', 'Income'])

function resolveCategory(dbCategory: string, type: 'income' | 'expense'): string {
  const mapped = CAT_MAP[dbCategory]
  if (!mapped) return type === 'income' ? 'Income' : 'Others'
  if (type === 'income' && !INCOME_CATS.has(mapped)) return 'Income'
  if (type === 'expense' && INCOME_CATS.has(mapped)) return 'Others'
  return mapped
}

const SKIP_RE = [
  /Kreditkartenumsatz/,
  /Vorgemerkt/,
  /Siehe Verrechnungskonto/,
  /Finanzübersicht/,
  /https?:\/\//,
  /\d+ of \d+/,
  /Gesamtsaldo/,
  /Umsätze aller Produkte/,
  /Hinweis zu Debitkarten/,
  /Aktuelle Umsätze/,
  /Deutsche Bank/,
]

const DATE_RE   = /(\d{2})\.(\d{2})\.(\d{4})/
const AMOUNT_RE = /([-]?\d[\d.]*,\d{2})\s*EUR\s*$/

function parseDate(line: string): string | null {
  const m = line.match(DATE_RE)
  if (!m || line.trim() !== m[0]) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

function parseAmount(line: string): number | null {
  const m = line.match(AMOUNT_RE)
  if (!m) return null
  return Math.round(parseFloat(m[1].replace(/\./g, '').replace(',', '.')) * 100)
}

function countLeadingSpaces(line: string): number {
  return line.search(/\S/)
}

function cleanMerchantDetails(raw: string): string {
  return raw.split('//')[0].trim().replace(/…$/, '').trim()
}

function hasCategoryInMiddle(line: string): boolean {
  const withoutAmount = line.replace(/\s+[-]?\d[\d.]*,\d{2}\s*EUR\s*$/, '').trimEnd().trimStart()
  return /\S\s{10,}\S/.test(withoutAmount)
}

function extractMergedLine(line: string): { merchant: string | null; dbCategory: string } {
  const withoutAmount = line.replace(/\s+[-]?\d[\d.]*,\d{2}\s*EUR\s*$/, '').trimEnd().trimStart()
  const parts = withoutAmount.split(/\s{10,}/)
  const dbCategory = (parts[parts.length - 1] ?? '').trim()
  const merchant = parts.length > 1 ? parts[0].trim() : null
  return { merchant, dbCategory }
}

export interface ParsedTx {
  date: string
  name: string
  amount: number
  type: 'income' | 'expense'
  category: string
  dbCategory: string
}

type State = 'LOOKING' | 'MERCHANT_FOUND' | 'TRANSACTION_DONE' | 'SKIP_BLOCK'

export function parsePDF(pdfPath: string): ParsedTx[] {
  const raw = execSync(`pdftotext -layout "${pdfPath}" -`, { maxBuffer: 50 * 1024 * 1024 }).toString()
  const lines = raw.split('\n')

  const txs: ParsedTx[] = []
  let state: State = 'LOOKING'
  let currentDate = ''
  let pendingMerchant = ''
  let lastWasAbrechnung = false

  for (const line of lines) {
    if (!line.trim()) {
      if (state !== 'MERCHANT_FOUND') {
        state = 'LOOKING'
        pendingMerchant = ''
        lastWasAbrechnung = false
      }
      continue
    }

    if (SKIP_RE.some(r => r.test(line))) {
      if (state !== 'TRANSACTION_DONE') state = 'SKIP_BLOCK'
      continue
    }

    if (/Ahmet Durak/.test(line) && countLeadingSpaces(line) > 50) continue

    const date = parseDate(line)
    if (date) {
      currentDate = date
      state = 'LOOKING'
      pendingMerchant = ''
      lastWasAbrechnung = false
      continue
    }

    const sp  = countLeadingSpaces(line)
    const amt = parseAmount(line)

    if (state === 'SKIP_BLOCK') continue

    if (state === 'TRANSACTION_DONE') {
      if (lastWasAbrechnung && sp <= 20 && !amt) {
        const realName = cleanMerchantDetails(line)
        if (realName && txs.length) txs[txs.length - 1]!.name = realName
        lastWasAbrechnung = false
      }
      continue
    }

    if (amt !== null && sp > 50) {
      const dbCategory = line.replace(AMOUNT_RE, '').trim()
      const type: 'income' | 'expense' = amt > 0 ? 'income' : 'expense'
      if (pendingMerchant && currentDate) {
        lastWasAbrechnung = pendingMerchant === 'ABRECHNUNG KARTE'
        txs.push({ date: currentDate, name: pendingMerchant, amount: Math.abs(amt), type, category: resolveCategory(dbCategory, type), dbCategory })
      }
      state = 'TRANSACTION_DONE'
      pendingMerchant = ''
      continue
    }

    if (amt !== null && sp <= 50) {
      if (hasCategoryInMiddle(line)) {
        const { merchant: lineMerchant, dbCategory } = extractMergedLine(line)
        const name = pendingMerchant || lineMerchant || 'Unknown'
        const type: 'income' | 'expense' = amt > 0 ? 'income' : 'expense'
        if (currentDate) {
          lastWasAbrechnung = false
          txs.push({ date: currentDate, name, amount: Math.abs(amt), type, category: resolveCategory(dbCategory, type), dbCategory })
        }
        state = 'TRANSACTION_DONE'
        pendingMerchant = ''
      } else {
        state = 'SKIP_BLOCK'
        pendingMerchant = ''
      }
      continue
    }

    if (sp <= 20) {
      if ((state === 'LOOKING' || state === 'MERCHANT_FOUND') && !pendingMerchant) {
        pendingMerchant = line.trim()
        state = 'MERCHANT_FOUND'
      }
    }
  }

  return txs
}
