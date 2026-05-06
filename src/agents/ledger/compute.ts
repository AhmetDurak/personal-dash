import { Transaction, MonthSummary, Category, EXPENSE_CATS } from '../../types'

export function computeSummary(month: string, txs: Transaction[]): MonthSummary {
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const byCategory = EXPENSE_CATS.reduce((acc, cat) => {
    acc[cat] = txs.filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0)
    return acc
  }, {} as Record<Category, number>)

  const totalExpenses = Object.values(byCategory).reduce((a, b) => a + b, 0)

  return {
    month,
    income,
    byCategory,
    totalExpenses,
    net: income - totalExpenses,
    endBalance: 0,
    investmentsYTD: 0,
  }
}
