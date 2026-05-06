export type TxType = 'income' | 'expense'

export type Category =
  | 'Income' | 'Fixed' | 'Market' | 'Health'
  | 'Investment' | 'Education' | 'Entertainment' | 'Others'

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
