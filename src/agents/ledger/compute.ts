import { Transaction, MonthSummary, Category, EXPENSE_CATS, INCOME_CATS } from '../../types'

export function computeSummary(month: string, txs: Transaction[]): MonthSummary {
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const byCategory = [...EXPENSE_CATS, ...INCOME_CATS].reduce((acc, cat) => {
    const isIncome = INCOME_CATS.includes(cat)
    acc[cat] = txs.filter(t => t.type === (isIncome ? 'income' : 'expense') && t.category === cat).reduce((s, t) => s + t.amount, 0)
    return acc
  }, {} as Record<Category, number>)

  const totalExpenses = EXPENSE_CATS.reduce((s, cat) => s + (byCategory[cat] ?? 0), 0)
  const net = income - totalExpenses

  return {
    month,
    income,
    byCategory,
    totalExpenses,
    net,
    endBalance: 0,
    investmentsYTD: 0,
    savingsRate: income > 0 ? net / income : 0,
  }
}
