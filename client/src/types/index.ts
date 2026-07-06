export type TxType = 'income' | 'expense'

export type Category =
  | 'Einkommen'
  | 'Lebenshaltung'
  | 'Wohnen'
  | 'Mobilität'
  | 'Freizeit und Reise'
  | 'Beruf und Bildung'
  | 'Gesundheit'
  | 'Kinder'
  | 'Sparen und Anlagen'
  | 'Versicherungen'
  | 'Kredite'
  | 'Sonstige'

export const INCOME_CATS: Category[] = ['Einkommen']

export const EXPENSE_CATS: Category[] = [
  'Lebenshaltung', 'Wohnen', 'Mobilität', 'Freizeit und Reise',
  'Beruf und Bildung', 'Gesundheit', 'Kinder', 'Sparen und Anlagen',
  'Versicherungen', 'Kredite', 'Sonstige',
]

export const ALL_CATS: Category[] = [...INCOME_CATS, ...EXPENSE_CATS]

export const CATEGORY_TREE: Record<Category, string[]> = {
  Einkommen: [
    'Lohn/Gehalt', 'Bargeldeinzahlung', 'Sonderzahlungen/Tantieme',
    'Einnahmen aus Verkäufen', 'Rente / Pension', 'Staatliche Leistungen',
    'Zinsen / Dividenden / Ausschüttungen', 'Erstattungen', 'Sonstige Einnahmen',
  ],
  Lebenshaltung: [
    'Lebensmittel / Getränke', 'Kleidung / Schuhe',
    'Telefon / Internet / Fernsehen / Radio', 'Frisör / Wellness',
    'Drogerieartikel', 'Tiere', 'Kantinenkosten', 'Geschenke',
    'Sonstige Ausgaben Lebenshaltung',
  ],
  Wohnen: [
    'Miete / Nebenkosten', 'Energie & Wasser', 'Möbel / Wohnaccessoires',
    'Hausgeld', 'Haushaltshilfe', 'Grundsteuern', 'Renovierung / Instandhaltung',
    'Sonstige Ausgaben Wohnen',
  ],
  Mobilität: [
    'Auto', 'Fahrrad', 'Öffentliche Verkehrsmittel', 'Taxi', 'Tanken',
    'Sonstige Ausgaben Mobilität',
  ],
  'Freizeit und Reise': [
    'Restaurants / Cafes / Bars', 'Events / Tickets', 'Sport / Fitness',
    'Hobbys / Vereine / Verbände', 'Urlaub- / Reisekosten',
    'Bücher / Musik / Filme / Apps', 'Elektronik / Computer / Games',
    'Abonnements', 'Sonstige Ausgaben Freizeit / Reise',
  ],
  'Beruf und Bildung': [
    'Büromaterial / Lehrmaterial', 'Dienstreise / Spesen', 'Studiengebühren',
    'Weiterbildung', 'Ausbildungsförderung', 'Sonstige Ausgaben Bildung und Beruf',
  ],
  Gesundheit: [
    'Apotheke / Medikamente', 'Arztbehandlung', 'Brille / Kontaktlinsen',
    'Krankenhaus', 'Sonstige Ausgaben Gesundheit',
  ],
  Kinder: [
    'Freizeitaktivitäten / Spielwaren', 'Kinderbekleidung', 'Kinderbetreuung',
    'Schulgeld', 'Taschengeld', 'Unterhaltszahlungen', 'Kindergeld',
    'Sonstige Ausgaben Kinder',
  ],
  'Sparen und Anlagen': [
    'Altersvorsorge', 'Bausparen', 'Sparbuch & Tagesgeld', 'Wertpapieranlage',
    'Sparplan', 'Kindersparplan', 'Mieteinnahmen', 'Sonstige Anlagen',
  ],
  Versicherungen: [
    'Berufsunfähigkeitsversicherung', 'Privat-Haftpflichtversicherung',
    'Hausratversicherung', 'Krankenversicherung', 'KFZ-Versicherung',
    'Lebensversicherung', 'Wohngebäudeversicherung', 'Rentenversicherung',
    'Pflegeversicherung', 'Rechtsschutzversicherung', 'Unfallversicherung',
    'Sonstige Ausgaben Versicherung',
  ],
  Kredite: [
    'Baufinanzierung', 'Autokredit', 'Ratenkredit',
    'Studenten-/Ausbildungskredit', 'Sonstige Kredite',
  ],
  Sonstige: [
    'Spenden', 'Öffentliche Kassen / Steuer', 'Kreditkarte',
    'Internetkäufe', 'Bargeld', 'Sonstiges',
  ],
}

// Maps old category values to new ones for DB migration and graceful fallback
export const LEGACY_CATEGORY_MAP: Record<string, Category> = {
  Income:             'Einkommen',
  Salary:             'Einkommen',
  Freelance:          'Einkommen',
  'Investment Income':'Sparen und Anlagen',
  'Other Income':     'Einkommen',
  Fixed:              'Wohnen',
  Market:             'Lebenshaltung',
  Health:             'Gesundheit',
  Investment:         'Sparen und Anlagen',
  Education:          'Beruf und Bildung',
  Entertainment:      'Freizeit und Reise',
  Others:             'Sonstige',
}

export interface Transaction {
  id: string
  date: string
  name: string
  amount: number
  type: TxType
  category: Category
  subcategory?: string | null
  source: 'bank' | 'manual'
  raw?: string
}

export interface MonthSummary {
  month: string
  income: number
  byCategory: Record<Category, number>
  totalExpenses: number
  net: number
  endBalance: number
  investmentsYTD: number
  savingsRate: number
}

// ─── Chart types ───────────────────────────────────────────────────────────────

export interface BalanceSeries {
  labels: string[]
  balance: number[]
  investmentsYTD: number[]
}

export interface DonutDataset {
  labels: Category[]
  values: number[]
  colors: string[]
}

export interface BarDataset {
  labels: string[]
  income: number[]
  expenses: number[]
}

export interface StackedDataset {
  labels: string[]
  categories: string[]
  series: Record<string, number[]>
}

export interface TopPayee {
  name: string
  total: number
}

// ─── ETF types ─────────────────────────────────────────────────────────────────

export interface ETFSnapshot {
  ticker: string
  name: string
  currency: string
  price: number
  previousClose: number
  change: number
  changePct: number
  high52w: number
  low52w: number
  nav: number | null
  totalAssets: number | null
  ter: number | null
  yield: number | null
  ytdReturn: number | null
  beta: number | null
  category: string | null
  fundFamily: string | null
  isin: string | null
  inception: string | null
  replicationMethod: string | null
  distribution: string | null
}

export interface ETFCandle { date: string; close: number }

export interface ETFHolding { name: string; weight: number }

export interface ETFComposition {
  topHoldings: ETFHolding[]
  sectors: { name: string; weight: number }[]
  countries: { name: string; weight: number }[]
  bondRating: { name: string; weight: number }[]
  equityStyle: string | null
}

export interface ETFRisk {
  beta: number | null
  alpha: number | null
  stdDev: number | null
  sharpe: number | null
  treynor: number | null
  r2: number | null
  meanReturn: number | null
}

export interface ETFSearchResult {
  ticker: string
  name: string
  exchange: string
}

export interface NewsItem {
  id: string
  title: string
  publisher: string
  link: string
  publishedAt: string
  thumbnail: string | null
}

export interface CategorizedNewsItem extends NewsItem {
  category: 'etf' | 'metals' | 'ai' | 'politics'
  relatedTicker?: string
}

export interface MetalPrice {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  currency: string
}

export interface NewsFeed {
  news: CategorizedNewsItem[]
  metals: MetalPrice[]
}

// ─── PDF import types ──────────────────────────────────────────────────────────

export interface ParsedTx {
  date: string
  name: string
  amount: number
  type: 'income' | 'expense'
  category: string
  subcategory?: string
  dbCategory: string
}

export interface PdfPreview {
  ready: ParsedTx[]
  conflicts: { existing: Transaction; incoming: ParsedTx }[]
}
