#!/usr/bin/env npx tsx
/**
 * Deutsche Bank PDF Transaction Importer
 * Usage:
 *   npx tsx scripts/import-db-pdf.ts <path.pdf> [--dry-run] [--api http://localhost:3001]
 */
import { execSync } from 'child_process'

// ── Category mapping (DB German → App category) ──────────────────────────────

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
  // Make sure income txs use income categories and vice versa
  if (type === 'income' && !INCOME_CATS.has(mapped)) return 'Income'
  if (type === 'expense' && INCOME_CATS.has(mapped)) return 'Others'
  return mapped
}

// ── Line helpers ──────────────────────────────────────────────────────────────

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
  // "Ahmet Durak" appears as the right-aligned page header (many leading spaces)
  // but also as a merchant (few leading spaces) — we skip only the header variant below
]

const DATE_RE = /(\d{2})\.(\d{2})\.(\d{4})/
const AMOUNT_RE = /([-]?\d[\d.]*,\d{2})\s*EUR\s*$/

function parseDate(line: string): string | null {
  const m = line.match(DATE_RE)
  if (!m) return null
  // Whole trimmed line must be just the date (a date header line)
  if (line.trim() !== m[0]) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

function parseAmount(line: string): number | null {
  const m = line.match(AMOUNT_RE)
  if (!m) return null
  const cents = Math.round(parseFloat(m[1].replace(/\./g, '').replace(',', '.')) * 100)
  return cents
}

function leadingSpaces(line: string): number {
  return line.search(/\S/)
}

function cleanMerchantDetails(raw: string): string {
  // "Lidl sagt Danke//Esslingen/DE 02-05-2026T19:01:35 Kar…" → "Lidl sagt Danke"
  return raw.split('//')[0].trim().replace(/…$/, '').trim()
}

/**
 * Some transactions have merchant + category + amount on ONE line, e.g.:
 *   "STUTTGARTER STRASSENBAHNEN AG          Öffentliche Verkehrsmittel      -59,85 EUR"
 *   "Unterhalt                              Sonstige Anlagen             -1.000,00 EUR"
 * Detect these by checking for a large whitespace gap within the text (before the amount).
 */
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

// ── Parser ────────────────────────────────────────────────────────────────────

interface Tx {
  date: string
  name: string
  amount: number   // positive cents
  type: 'income' | 'expense'
  category: string
  dbCategory: string
}

type State = 'LOOKING' | 'MERCHANT_FOUND' | 'TRANSACTION_DONE' | 'SKIP_BLOCK'

export function parsePDF(pdfPath: string): Tx[] {
  const raw = execSync(`pdftotext -layout "${pdfPath}" -`, { maxBuffer: 50 * 1024 * 1024 }).toString()
  const lines = raw.split('\n')

  const txs: Tx[] = []
  let state: State = 'LOOKING'
  let currentDate = ''
  let pendingMerchant = ''
  let lastWasAbrechnung = false

  for (const line of lines) {
    // ── blank line ─────────────────────────────────────────────────────────
    if (!line.trim()) {
      if (state !== 'MERCHANT_FOUND') {
        state = 'LOOKING'
        pendingMerchant = ''
        lastWasAbrechnung = false
      }
      continue
    }

    // ── skip patterns ───────────────────────────────────────────────────────
    if (SKIP_RE.some(r => r.test(line))) {
      if (state !== 'TRANSACTION_DONE') state = 'SKIP_BLOCK'
      continue
    }

    // ── skip right-aligned page header "Ahmet Durak" (leadingSpaces > 50) ──
    if (/Ahmet Durak/.test(line) && leadingSpaces(line) > 50) continue

    // ── date header ─────────────────────────────────────────────────────────
    const date = parseDate(line)
    if (date) {
      currentDate = date
      state = 'LOOKING'
      pendingMerchant = ''
      lastWasAbrechnung = false
      continue
    }

    const sp   = leadingSpaces(line)
    const amt  = parseAmount(line)

    // ── SKIP_BLOCK: absorb everything until blank resets ────────────────────
    if (state === 'SKIP_BLOCK') continue

    // ── TRANSACTION_DONE: extra-info line or next merchant ──────────────────
    if (state === 'TRANSACTION_DONE') {
      // If the last tx was ABRECHNUNG KARTE, use this line to get the real name
      if (lastWasAbrechnung && sp <= 20 && !amt) {
        const realName = cleanMerchantDetails(line)
        if (realName && txs.length) txs[txs.length - 1]!.name = realName
        lastWasAbrechnung = false
      }
      continue
    }

    // ── Amount line with many leading spaces → category + amount ────────────
    if (amt !== null && sp > 50) {
      const dbCategory = line.replace(AMOUNT_RE, '').trim()
      const type: 'income' | 'expense' = amt > 0 ? 'income' : 'expense'
      const category = resolveCategory(dbCategory, type)

      if (pendingMerchant && currentDate) {
        lastWasAbrechnung = pendingMerchant === 'ABRECHNUNG KARTE'
        txs.push({
          date: currentDate,
          name: pendingMerchant,
          amount: Math.abs(amt),
          type,
          category,
          dbCategory,
        })
      }
      state = 'TRANSACTION_DONE'
      pendingMerchant = ''
      continue
    }

    // ── Amount on same line as merchant (short indent) ──────────────────────
    if (amt !== null && sp <= 50) {
      if (hasCategoryInMiddle(line)) {
        // Merged line: "MERCHANT         CATEGORY         -amount EUR"
        // Also handles: "sub-detail         CATEGORY         -amount EUR" (prev merchant in pendingMerchant)
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
        // Just merchant + amount, no category in middle → Kreditkartenumsatz, skip
        state = 'SKIP_BLOCK'
        pendingMerchant = ''
      }
      continue
    }

    // ── Text line with no amount ────────────────────────────────────────────
    if (sp <= 20) {
      if (state === 'LOOKING' || state === 'MERCHANT_FOUND') {
        if (!pendingMerchant) {
          pendingMerchant = line.trim()
          state = 'MERCHANT_FOUND'
        }
        // subsequent text lines before amount = extra context, ignore
      }
    }
  }

  return txs
}

// ── Importer ──────────────────────────────────────────────────────────────────

async function importAll(txs: Tx[], apiBase: string) {
  let ok = 0, fail = 0
  for (const tx of txs) {
    try {
      const res = await fetch(`${apiBase}/api/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: tx.date,
          name: tx.name,
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          source: 'bank',
        }),
      })
      if (res.ok) {
        ok++
      } else {
        const err = await res.json() as { error: string }
        console.error(`  ✗ ${tx.date} ${tx.name}: ${err.error}`)
        fail++
      }
    } catch (e) {
      console.error(`  ✗ ${tx.date} ${tx.name}: ${(e as Error).message}`)
      fail++
    }
  }
  return { ok, fail }
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

const pdfPath = process.argv[2]
if (!pdfPath) {
  console.error('Usage: npx tsx scripts/import-db-pdf.ts <path.pdf> [--dry-run] [--api <url>]')
  process.exit(1)
}

const dryRun  = process.argv.includes('--dry-run')
const apiIdx  = process.argv.indexOf('--api')
const apiBase = apiIdx >= 0 ? process.argv[apiIdx + 1] : 'http://localhost:3001'

console.log(`\nParsing: ${pdfPath}`)
const txs = parsePDF(pdfPath)

// ── Preview table ─────────────────────────────────────────────────────────────
const pad = (s: string, n: number) => s.slice(0, n).padEnd(n)
console.log(`\nFound ${txs.length} transactions:\n`)
console.log(`${'DATE'.padEnd(12)} ${'TYPE'.padEnd(8)} ${'CAT'.padEnd(16)} ${'DB CATEGORY'.padEnd(40)} ${'EUR'.padStart(9)} NAME`)
console.log('─'.repeat(110))
for (const tx of txs) {
  const eur = ((tx.type === 'expense' ? -1 : 1) * tx.amount / 100).toFixed(2).padStart(9)
  console.log(`${tx.date.padEnd(12)} ${tx.type.padEnd(8)} ${pad(tx.category, 16)} ${pad(tx.dbCategory, 40)} ${eur} ${tx.name}`)
}

if (dryRun) {
  console.log('\n[Dry run — not importing]\n')
  process.exit(0)
}

void (async () => {
  console.log(`\nImporting to ${apiBase}…`)
  const { ok, fail } = await importAll(txs, apiBase)
  console.log(`\nDone: ${ok} imported, ${fail} failed\n`)
})()
