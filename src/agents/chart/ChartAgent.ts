import { MonthSummary, Category, EXPENSE_CATS, INCOME_CATS } from '../../types'

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

export const CAT_COLORS: Record<Category, string> = {
  Einkommen:            '#00B087',
  Lebenshaltung:        '#378ADD',
  Wohnen:               '#888780',
  Mobilität:            '#E07B39',
  'Freizeit und Reise': '#D4537E',
  'Beruf und Bildung':  '#BA7517',
  Gesundheit:           '#D85A30',
  Kinder:               '#6EBF9E',
  'Sparen und Anlagen': '#534AB7',
  Versicherungen:       '#5B8DB8',
  Kredite:              '#C05B5B',
  Sonstige:             '#3B6D11',
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
        cumInvest += s.byCategory['Sparen und Anlagen'] ?? 0
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

  getStackedExpenses(summaries: MonthSummary[]): StackedDataset {
    const cats = EXPENSE_CATS.filter(c => summaries.some(s => (s.byCategory[c] ?? 0) > 0))
    const series: Record<string, number[]> = {}
    for (const cat of cats) {
      series[cat] = summaries.map(s => centsToEuros(s.byCategory[cat] ?? 0))
    }
    return { labels: summaries.map(s => shortLabel(s.month)), categories: cats, series }
  }

  getStackedIncome(summaries: MonthSummary[]): StackedDataset {
    const cats = INCOME_CATS.filter(c => summaries.some(s => (s.byCategory[c] ?? 0) > 0))
    const series: Record<string, number[]> = {}
    for (const cat of cats) {
      series[cat] = summaries.map(s => centsToEuros(s.byCategory[cat] ?? 0))
    }
    return { labels: summaries.map(s => shortLabel(s.month)), categories: cats, series }
  }
}
