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
