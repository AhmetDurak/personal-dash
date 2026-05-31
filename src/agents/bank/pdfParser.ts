import { execSync } from 'child_process'

const CAT_MAP: Record<string, { parent: string; sub: string }> = {
  'Lohn / Gehalt':                          { parent: 'Einkommen',            sub: 'Lohn/Gehalt' },
  'Sonstige Einnahmen':                     { parent: 'Einkommen',            sub: 'Sonstige Einnahmen' },
  'Zinsen / Dividenden / Ausschüttungen':   { parent: 'Einkommen',            sub: 'Zinsen / Dividenden / Ausschüttungen' },
  'Erstattungen':                           { parent: 'Einkommen',            sub: 'Erstattungen' },
  'Lebensmittel / Getränke':                { parent: 'Lebenshaltung',         sub: 'Lebensmittel / Getränke' },
  'Drogerieartikel':                        { parent: 'Lebenshaltung',         sub: 'Drogerieartikel' },
  'Kleidung / Schuhe':                      { parent: 'Lebenshaltung',         sub: 'Kleidung / Schuhe' },
  'Telefon / Internet / Fernsehen / Radio': { parent: 'Lebenshaltung',         sub: 'Telefon / Internet / Fernsehen / Radio' },
  'Geschenke':                              { parent: 'Lebenshaltung',         sub: 'Geschenke' },
  'Miete / Nebenkosten':                    { parent: 'Wohnen',                sub: 'Miete / Nebenkosten' },
  'Energie & Wasser':                       { parent: 'Wohnen',                sub: 'Energie & Wasser' },
  'Tanken':                                 { parent: 'Mobilität',             sub: 'Tanken' },
  'Auto':                                   { parent: 'Mobilität',             sub: 'Auto' },
  'Öffentliche Verkehrsmittel':             { parent: 'Mobilität',             sub: 'Öffentliche Verkehrsmittel' },
  'Restaurants / Cafes / Bars':             { parent: 'Freizeit und Reise',    sub: 'Restaurants / Cafes / Bars' },
  'Bücher / Musik / Filme / Apps':          { parent: 'Freizeit und Reise',    sub: 'Bücher / Musik / Filme / Apps' },
  'Hobbys / Vereine / Verbände':            { parent: 'Freizeit und Reise',    sub: 'Hobbys / Vereine / Verbände' },
  'Abonnements':                            { parent: 'Freizeit und Reise',    sub: 'Abonnements' },
  'Elektronik / Computer / Games':          { parent: 'Freizeit und Reise',    sub: 'Elektronik / Computer / Games' },
  'Sonstige Ausgaben Bildung und Beruf':    { parent: 'Beruf und Bildung',     sub: 'Sonstige Ausgaben Bildung und Beruf' },
  'Sport / Fitness':                        { parent: 'Gesundheit',            sub: 'Sport / Fitness' },
  'Krankenversicherung':                    { parent: 'Versicherungen',        sub: 'Krankenversicherung' },
  'Lebensversicherung':                     { parent: 'Versicherungen',        sub: 'Lebensversicherung' },
  'Rentenversicherung':                     { parent: 'Versicherungen',        sub: 'Rentenversicherung' },
  'Sonstige Ausgaben Versicherung':         { parent: 'Versicherungen',        sub: 'Sonstige Ausgaben Versicherung' },
  'Sonstige Kredite':                       { parent: 'Kredite',               sub: 'Sonstige Kredite' },
  'Autokredit':                             { parent: 'Kredite',               sub: 'Autokredit' },
  'Sonstige Anlagen':                       { parent: 'Sparen und Anlagen',    sub: 'Sonstige Anlagen' },
  'Unterhaltszahlungen':                    { parent: 'Kinder',                sub: 'Unterhaltszahlungen' },
  'Bargeld':                                { parent: 'Sonstige',              sub: 'Bargeld' },
  'Öffentliche Kassen / Steuer':            { parent: 'Sonstige',              sub: 'Öffentliche Kassen / Steuer' },
  'Internetkäufe':                          { parent: 'Sonstige',              sub: 'Internetkäufe' },
  'Sonstiges':                              { parent: 'Sonstige',              sub: 'Sonstiges' },
  'Unkategorisiert':                        { parent: 'Sonstige',              sub: 'Sonstiges' },
}

function resolveCategory(dbCategory: string, type: 'income' | 'expense'): string {
  const mapped = CAT_MAP[dbCategory]
  return mapped ? mapped.parent : (type === 'income' ? 'Einkommen' : 'Sonstige')
}

function resolveSubcategory(dbCategory: string): string | undefined {
  return CAT_MAP[dbCategory]?.sub
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
  subcategory?: string
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
        txs.push({ date: currentDate, name: pendingMerchant, amount: Math.abs(amt), type, category: resolveCategory(dbCategory, type), subcategory: resolveSubcategory(dbCategory), dbCategory })
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
          txs.push({ date: currentDate, name, amount: Math.abs(amt), type, category: resolveCategory(dbCategory, type), subcategory: resolveSubcategory(dbCategory), dbCategory })
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
