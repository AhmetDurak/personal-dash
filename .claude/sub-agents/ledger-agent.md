# LedgerAgent

## Responsibility
Merge bank transactions + manual entries. CRUD for manual entries.
Compute `MonthSummary` per month. Single source of truth for all financial data.

## Interface
```ts
interface LedgerAgent {
  // Manual entries
  addEntry(entry: Omit<Transaction, 'id' | 'source'>): Promise<Transaction>
  updateEntry(id: string, patch: Partial<Transaction>): Promise<Transaction>
  deleteEntry(id: string): Promise<void>

  // Queries
  getTransactions(month: string): Promise<Transaction[]>   // month = 'YYYY-MM'
  getSummary(month: string): Promise<MonthSummary>
  getCumulativeBalance(upToMonth: string): Promise<number>
}
```

## Repository Pattern (Dependency Inversion)
```ts
// src/agents/ledger/TransactionRepository.ts
interface TransactionRepository {
  findByMonth(month: string): Promise<Transaction[]>
  save(tx: Transaction): Promise<Transaction>
  update(id: string, patch: Partial<Transaction>): Promise<Transaction>
  delete(id: string): Promise<void>
}

// Swap PostgresRepo for InMemoryRepo in tests — no code change in LedgerAgent
```

## Core Logic
```ts
// src/agents/ledger/LedgerAgent.ts
export class LedgerAgent {
  constructor(private repo: TransactionRepository) {}

  async addEntry(entry: Omit<Transaction, 'id' | 'source'>): Promise<Transaction> {
    const tx: Transaction = { ...entry, id: crypto.randomUUID(), source: 'manual' }
    return this.repo.save(tx)
  }

  async getTransactions(month: string): Promise<Transaction[]> {
    return this.repo.findByMonth(month)
  }

  async getSummary(month: string): Promise<MonthSummary> {
    const txs = await this.repo.findByMonth(month)
    return computeSummary(txs)
  }

  async getCumulativeBalance(upToMonth: string): Promise<number> {
    // Sum all nets from account opening to upToMonth
    const months = getMonthRange(ACCOUNT_OPEN_DATE, upToMonth)
    const summaries = await Promise.all(months.map(m => this.getSummary(m)))
    return OPENING_BALANCE + summaries.reduce((s, m) => s + m.net, 0)
  }
}
```

## Pure Computation (no I/O)
```ts
// src/agents/ledger/compute.ts
export function computeSummary(txs: Transaction[]): MonthSummary {
  const income = sum(txs.filter(t => t.type === 'income'))
  const byCategory = groupSum(txs.filter(t => t.type === 'expense'))
  const totalExpenses = Object.values(byCategory).reduce((a, b) => a + b, 0)
  return { income, byCategory, totalExpenses, net: income - totalExpenses, endBalance: 0, investmentsYTD: 0 }
  // endBalance and investmentsYTD filled by getCumulativeBalance
}

function sum(txs: Transaction[]): number {
  return txs.reduce((s, t) => s + t.amount, 0)
}

function groupSum(txs: Transaction[]): Record<Category, number> {
  return txs.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {} as Record<Category, number>)
}
```

## API Routes
```
POST   /api/entries          → addEntry
PATCH  /api/entries/:id      → updateEntry
DELETE /api/entries/:id      → deleteEntry
GET    /api/summary/:month   → getSummary (YYYY-MM)
GET    /api/transactions/:month
```

## DB Schema (PostgreSQL)
```sql
CREATE TABLE transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  name        TEXT NOT NULL,
  amount      INTEGER NOT NULL,  -- cents, always positive
  type        TEXT NOT NULL CHECK (type IN ('income','expense')),
  category    TEXT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('bank','manual')),
  raw         TEXT,
  month       TEXT NOT NULL,     -- 'YYYY-MM' index
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_tx_month ON transactions(month);
```
