export type TxType = 'income' | 'expense'

export type Category =
  | 'Income' | 'Salary' | 'Freelance' | 'Investment Income' | 'Other Income'
  | 'Fixed' | 'Market' | 'Health' | 'Investment' | 'Education' | 'Entertainment' | 'Others'

export const INCOME_CATS: Category[] = [
  'Salary', 'Freelance', 'Investment Income', 'Other Income', 'Income',
]

export const EXPENSE_CATS: Category[] = [
  'Fixed', 'Market', 'Health', 'Investment', 'Education', 'Entertainment', 'Others',
]

export interface Transaction {
  id: string
  date: string
  name: string
  amount: number
  type: TxType
  category: Category
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

export interface StackedDataset {
  labels: string[]
  categories: string[]
  series: Record<string, number[]>
}

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

export interface ParsedTx {
  date: string
  name: string
  amount: number
  type: TxType
  category: Category
}

export interface PdfConflict {
  existing: Transaction
  incoming: ParsedTx
}

export interface PdfPreview {
  ready: ParsedTx[]
  conflicts: PdfConflict[]
}

export interface TopPayee { name: string; total: number }

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
  news: NewsItem[]
  metals: MetalPrice[]
}
