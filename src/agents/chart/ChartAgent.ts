import { MonthSummary, Category, EXPENSE_CATS } from '../../types'

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

export const CAT_COLORS: Record<Category, string> = {
  Fixed: '#888780',
  Market: '#378ADD',
  Health: '#D85A30',
  Investment: '#534AB7',
  Education: '#BA7517',
  Entertainment: '#D4537E',
  Others: '#3B6D11',
  Income: '#1D9E75',
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

function shortLabel(month: string): string {
  const [, m] = month.split('-')
  return MONTH_LABELS[m] ?? month
}

function centsToEuros(cents: number): number {
  return cents / 100
}

export class ChartAgent {
  getBalanceSeries(summaries: MonthSummary[]): BalanceSeries {
    let cumInvest = 0
    return {
      labels: summaries.map(s => shortLabel(s.month)),
      balance: summaries.map(s => centsToEuros(s.endBalance)),
      investmentsYTD: summaries.map(s => {
        cumInvest += s.byCategory.Investment ?? 0
        return centsToEuros(cumInvest)
      }),
    }
  }

  getCategoryDonut(summary: MonthSummary): DonutDataset {
    const cats = EXPENSE_CATS.filter(c => (summary.byCategory[c] ?? 0) > 0)
    return {
      labels: cats,
      values: cats.map(c => centsToEuros(summary.byCategory[c] ?? 0)),
      colors: cats.map(c => CAT_COLORS[c]),
    }
  }

  getIncomeVsExpenseBar(summaries: MonthSummary[]): BarDataset {
    return {
      labels: summaries.map(s => shortLabel(s.month)),
      income: summaries.map(s => centsToEuros(s.income)),
      expenses: summaries.map(s => centsToEuros(s.totalExpenses)),
    }
  }
}
