# ChartAgent

## Responsibility
Transform `MonthSummary[]` → chart-ready datasets.
Pure functions only. No I/O, no React.

## Interface
```ts
interface ChartAgent {
  getBalanceSeries(summaries: MonthSummary[]): BalanceSeries
  getCategoryDonut(summary: MonthSummary): DonutDataset
  getIncomeVsExpenseBar(summaries: MonthSummary[]): BarDataset
}

interface BalanceSeries {
  labels: string[]
  balance: number[]
  investmentsYTD: number[]
}

interface DonutDataset {
  labels: Category[]
  values: number[]
  colors: string[]
}

interface BarDataset {
  labels: string[]
  income: number[]
  expenses: number[]
}
```

## Implementation
```ts
// src/agents/chart/ChartAgent.ts

const CAT_COLORS: Record<Category, string> = {
  Fixed: '#888780', Market: '#378ADD', Health: '#D85A30',
  Investment: '#534AB7', Education: '#BA7517', Entertainment: '#D4537E',
  Others: '#3B6D11', Income: '#1D9E75',
}

export class ChartAgent {
  getBalanceSeries(summaries: MonthSummary[]): BalanceSeries {
    let cumInvest = 0
    return {
      labels: summaries.map(s => s.month),
      balance: summaries.map(s => s.endBalance),
      investmentsYTD: summaries.map(s => {
        cumInvest += s.byCategory.Investment ?? 0
        return cumInvest
      }),
    }
  }

  getCategoryDonut(summary: MonthSummary): DonutDataset {
    const cats = EXPENSE_CATS.filter(c => (summary.byCategory[c] ?? 0) > 0)
    return {
      labels: cats,
      values: cats.map(c => summary.byCategory[c] ?? 0),
      colors: cats.map(c => CAT_COLORS[c]),
    }
  }

  getIncomeVsExpenseBar(summaries: MonthSummary[]): BarDataset {
    return {
      labels: summaries.map(s => s.month),
      income: summaries.map(s => s.income),
      expenses: summaries.map(s => s.totalExpenses),
    }
  }
}
```

## Recharts Integration (UIAgent consumes these)
```ts
// ChartAgent output maps directly to Recharts props:
// BalanceSeries → <LineChart data={zip(labels, balance, investmentsYTD)} />
// DonutDataset  → <PieChart> with <Cell fill={color} />
// BarDataset    → <BarChart> with two <Bar> components
```

## Rules
- Colors defined once in `CAT_COLORS` — UIAgent never hardcodes colors
- All values in euros (converted from cents at this layer)
- Labels use short month format: `'Jan'`, `'Feb'` — not full ISO strings
