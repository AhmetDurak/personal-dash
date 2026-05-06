# Finance Dashboard — Claude Orchestrator

## Project
Deutsche Bank personal finance dashboard (web → iOS React Native).
PSD2/OAuth2 bank connection. Categorised cash flow table + charts.

## Stack
- **Frontend**: React + TypeScript, Recharts, Tailwind
- **Mobile**: React Native + Expo (shared business logic)
- **Backend**: Node.js + Express, PostgreSQL
- **Auth**: Deutsche Bank PSD2 OAuth2 (XS2A standard)

## Sub-Agents

| Agent | File | Responsibility |
|---|---|---|
| BankAgent | `agents/bank-agent.md` | PSD2 OAuth2, fetch accounts/transactions |
| CategoryAgent | `agents/category-agent.md` | Map DB categories → app categories |
| LedgerAgent | `agents/ledger-agent.md` | CRUD manual entries, compute totals |
| ChartAgent | `agents/chart-agent.md` | Derive chart datasets from ledger |
| UIAgent | `agents/ui-agent.md` | React components, iOS layout rules |

## Data Flow
```
BankAgent → raw transactions
    ↓
CategoryAgent → categorised transactions
    ↓
LedgerAgent ← manual entries (CRUD)
    ↓
ChartAgent → chart datasets
    ↓
UIAgent → rendered dashboard
```

## Categories
`Income | Fixed | Market | Health | Investment | Education | Entertainment | Others`

## SOLID Rules (enforce in all agents)
- **S** — each agent owns one slice of the pipeline
- **O** — extend categories/charts via config, not code changes
- **L** — manual entries satisfy same `Transaction` interface as bank entries
- **I** — agents expose minimal interfaces; no god objects
- **D** — depend on `TransactionRepository` interface, not concrete DB

## Shared Types
```ts
type TxType = 'income' | 'expense'
type Category = 'Income'|'Fixed'|'Market'|'Health'|'Investment'|'Education'|'Entertainment'|'Others'

interface Transaction {
  id: string
  date: string        // ISO
  name: string
  amount: number      // always positive
  type: TxType
  category: Category
  source: 'bank' | 'manual'
  raw?: string        // DB original category code
}

interface MonthSummary {
  income: number
  byCategory: Record<Category, number>
  totalExpenses: number
  net: number
  endBalance: number
  investmentsYTD: number
}
```

## Conventions
- No `any` in TypeScript
- Pure functions for all financial calculations
- Side effects only in agent boundary (API calls, DB writes)
- Amounts always stored as positive integers (cents); display layer formats
